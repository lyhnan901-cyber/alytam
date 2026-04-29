-- حذف السياسة الحالية
DROP POLICY IF EXISTS "Create requests" ON public.requests;

-- إنشاء سياسة جديدة تتضمن المدير التنفيذي
CREATE POLICY "Create requests" ON public.requests
FOR INSERT TO authenticated
WITH CHECK (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'CustomerService') OR
  has_role(auth.uid(), 'ExecutiveManager')
);