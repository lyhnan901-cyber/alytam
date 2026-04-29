-- ==========================================
-- المرحلة 1: تقييد سياسة RLS للـ profiles
-- ==========================================

-- حذف السياسة الحالية التي تسمح للجميع بالقراءة
DROP POLICY IF EXISTS "View profiles" ON public.profiles;

-- إنشاء سياسة جديدة أكثر تقييداً
CREATE POLICY "View profiles based on role" ON public.profiles
FOR SELECT
USING (
  -- يمكن للمستخدم رؤية ملفه الشخصي
  auth.uid() = id
  OR
  -- المدراء والمشرفين يرون الجميع
  is_general_manager(auth.uid())
  OR
  has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR
  has_role(auth.uid(), 'Supervisor'::app_role)
  OR
  has_role(auth.uid(), 'CustomerService'::app_role)
  OR
  -- رئيس القسم يرى موظفي قسمه
  (
    has_role(auth.uid(), 'DepartmentHead'::app_role)
    AND department_id = get_user_department(auth.uid())
  )
  OR
  -- الموظف يرى زملاءه في نفس القسم
  (
    has_role(auth.uid(), 'Employee'::app_role)
    AND department_id = get_user_department(auth.uid())
  )
);

-- ==========================================
-- المرحلة 2: إنشاء جدول إعدادات المستخدم
-- ==========================================

CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ar',
  timezone TEXT NOT NULL DEFAULT 'asia_riyadh',
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  animations_enabled BOOLEAN NOT NULL DEFAULT true,
  new_task_notifications BOOLEAN NOT NULL DEFAULT true,
  status_update_notifications BOOLEAN NOT NULL DEFAULT true,
  overdue_task_notifications BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_logout_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يرى إعداداته فقط
CREATE POLICY "Users can view own settings" ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- سياسة الإدراج: المستخدم يضيف إعداداته فقط
CREATE POLICY "Users can insert own settings" ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- سياسة التحديث: المستخدم يعدل إعداداته فقط
CREATE POLICY "Users can update own settings" ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger لتحديث updated_at تلقائياً
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();