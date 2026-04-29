-- إضافة سياسة جديدة للسماح للمدير العام بتحديث أي profile
CREATE POLICY "GM can update any profile"
ON public.profiles
FOR UPDATE
USING (is_general_manager(auth.uid()));