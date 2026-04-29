-- تحديث سياسة إنشاء الطلبات لتشمل المشرف
DROP POLICY IF EXISTS "Create requests" ON public.requests;

CREATE POLICY "Create requests" ON public.requests
FOR INSERT TO authenticated
WITH CHECK (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'CustomerService') OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'Supervisor')
);

-- تحديث سياسة إنشاء المهام لتشمل المشرف
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;

CREATE POLICY "Create tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'CustomerService') OR
  has_role(auth.uid(), 'Supervisor')
);