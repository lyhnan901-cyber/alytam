-- ============================================================================
-- ميزة 1: التعيين المباشر للمشرف (Supervisor direct task/request assignment)
-- ميزة 2: التحكم بظهور الأقسام لكل مستخدم (per-user department access whitelist)
--
-- لمحة:
--   * يضاف جدول user_department_access كقائمة بيضاء (whitelist) لكل مستخدم.
--   * إذا لم يكن للمستخدم أي صف في هذا الجدول → غير مقيَّد (يرى كل الأقسام
--     ضمن صلاحيات دوره الحالية).
--   * عند وجود صفوف → المستخدم مقيَّد بهذه الأقسام فقط.
--   * المدير العام (GM) يتجاوز التقييد دائماً.
--   * يطبَّق التقييد على دور المشرف (Supervisor) في سياسات RLS لجداول tasks و
--     requests. باقي الأدوار غير متأثّرة في هذه الـ migration حتى لا نكسر
--     سلوكاً قائماً.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) جدول قائمة الوصول إلى الأقسام
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_department_access (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  granted_by    UUID NOT NULL REFERENCES auth.users(id),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_user_department_access_user_id
  ON public.user_department_access(user_id);

ALTER TABLE public.user_department_access ENABLE ROW LEVEL SECURITY;

-- المدير العام يقرأ ويعدّل كل شيء
CREATE POLICY "GM can view all department access"
  ON public.user_department_access
  FOR SELECT
  USING (public.is_general_manager(auth.uid()));

CREATE POLICY "GM can grant department access"
  ON public.user_department_access
  FOR INSERT
  WITH CHECK (public.is_general_manager(auth.uid()) AND granted_by = auth.uid());

CREATE POLICY "GM can revoke department access"
  ON public.user_department_access
  FOR DELETE
  USING (public.is_general_manager(auth.uid()));

-- المستخدم يرى صلاحيات الأقسام الخاصة به (يحتاجها العميل لمعرفة ماذا يعرض)
CREATE POLICY "Users can view own department access"
  ON public.user_department_access
  FOR SELECT
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 2) دوال مساعدة (Security Definer مع search_path آمن)
-- ----------------------------------------------------------------------------

-- هل للمستخدم أي قيود على الأقسام؟ (وجود أي صف يعني مقيَّد)
CREATE OR REPLACE FUNCTION public.user_has_dept_restrictions(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_department_access WHERE user_id = _user_id
  );
$$;

-- هل يستطيع المستخدم الوصول إلى قسم معيَّن؟
-- - GM: نعم دائماً.
-- - department_id IS NULL (مهمة/طلب لم يُسنَد لقسم بعد): نعم — حتى لا نخفيه
--   عن المشرف الذي ينبغي أن يوزّعه.
-- - مستخدم بدون قيود: نعم.
-- - مستخدم مقيَّد: نعم فقط إذا كان القسم في قائمته البيضاء.
CREATE OR REPLACE FUNCTION public.can_user_access_department(
  _user_id uuid,
  _dept_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN _user_id IS NULL THEN false
      WHEN public.is_general_manager(_user_id) THEN true
      WHEN _dept_id IS NULL THEN true
      WHEN NOT public.user_has_dept_restrictions(_user_id) THEN true
      ELSE EXISTS (
        SELECT 1 FROM public.user_department_access
        WHERE user_id = _user_id AND department_id = _dept_id
      )
    END;
$$;

-- ----------------------------------------------------------------------------
-- 3) تعديل سياسات RLS للمهام (tasks) لاحترام التقييد على المشرف
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "View tasks based on role" ON public.tasks;
CREATE POLICY "View tasks based on role" ON public.tasks
FOR SELECT TO authenticated
USING (
  is_general_manager(auth.uid())
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR (
    has_role(auth.uid(), 'Supervisor'::app_role)
    AND can_user_access_department(auth.uid(), department_id)
  )
  OR (
    has_role(auth.uid(), 'DepartmentHead'::app_role)
    AND department_id = get_user_department(auth.uid())
  )
  OR assignee_id = auth.uid()
);

DROP POLICY IF EXISTS "Update tasks based on role" ON public.tasks;
CREATE POLICY "Update tasks based on role" ON public.tasks
FOR UPDATE TO authenticated
USING (
  is_general_manager(auth.uid())
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR (
    has_role(auth.uid(), 'Supervisor'::app_role)
    AND can_user_access_department(auth.uid(), department_id)
  )
  OR (
    has_role(auth.uid(), 'DepartmentHead'::app_role)
    AND department_id = get_user_department(auth.uid())
  )
  OR assignee_id = auth.uid()
);

-- INSERT: نضمن أن المشرف يستطيع إنشاء مهام (مدعوم سابقاً) وأن أي قسم يضعه يجب
-- أن يكون ضمن قائمته البيضاء (إن كانت موجودة).
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;
CREATE POLICY "Create tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  is_general_manager(auth.uid())
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR has_role(auth.uid(), 'CustomerService'::app_role)
  OR (
    has_role(auth.uid(), 'Supervisor'::app_role)
    AND can_user_access_department(auth.uid(), department_id)
  )
  OR (
    has_role(auth.uid(), 'DepartmentHead'::app_role)
    AND can_user_access_department(auth.uid(), department_id)
  )
);

-- ----------------------------------------------------------------------------
-- 4) تعديل سياسات RLS للطلبات (requests) لاحترام التقييد على المشرف
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "View requests based on role" ON public.requests;
CREATE POLICY "View requests based on role" ON public.requests
FOR SELECT TO authenticated
USING (
  is_general_manager(auth.uid())
  OR has_role(auth.uid(), 'CustomerService'::app_role)
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR (
    has_role(auth.uid(), 'Supervisor'::app_role)
    AND (
      target_department_id IS NULL
      OR can_user_access_department(auth.uid(), target_department_id)
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.request_id = requests.id
        AND can_user_access_department(auth.uid(), t.department_id)
      )
    )
  )
  OR has_role(auth.uid(), 'DepartmentHead'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.request_id = requests.id
    AND (t.assignee_id = auth.uid() OR t.department_id = get_user_department(auth.uid()))
  )
);

-- ----------------------------------------------------------------------------
-- 5) تعديل سياسة جدول departments بحيث يظهر للمستخدم المقيَّد فقط
--    أقسامُه المسموحة. المستخدمون غير المقيَّدين والـ GM يرون كل الأقسام.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view departments" ON public.departments;
CREATE POLICY "View departments based on access" ON public.departments
FOR SELECT TO authenticated
USING (
  public.is_general_manager(auth.uid())
  OR public.can_user_access_department(auth.uid(), id)
);

-- ----------------------------------------------------------------------------
-- 6) تحديث صلاحيات الدور (role_permissions) — منح المشرف صلاحية التعيين المباشر
-- ----------------------------------------------------------------------------
-- نضيف 'tasks_direct_assign' للمشرف. واجهة المستخدم ستفحصها لإظهار الخيار.
UPDATE public.role_permissions
SET permissions = ARRAY(
  SELECT DISTINCT unnest(permissions || ARRAY['tasks_direct_assign'])
)
WHERE role IN ('Supervisor'::app_role, 'GeneralManager'::app_role);

-- ----------------------------------------------------------------------------
-- 6) Trigger لتسجيل النشاط عند منح/سحب الوصول للأقسام (اختياري لكنه مفيد)
-- ----------------------------------------------------------------------------
-- نتركه للتطبيق على مستوى الكود لتجنّب تعقيد إضافي في DB.

COMMENT ON TABLE public.user_department_access IS
  'قائمة بيضاء للأقسام لكل مستخدم. وجود أي صف يعني تقييد المستخدم بتلك الأقسام فقط. غياب الصفوف = لا قيود.';

COMMENT ON FUNCTION public.can_user_access_department(uuid, uuid) IS
  'يرجع TRUE إذا كان المستخدم يستطيع الوصول للقسم (GM دائماً TRUE، NULL dept = TRUE، بدون قيود = TRUE، مع قيود يفحص القائمة البيضاء).';
