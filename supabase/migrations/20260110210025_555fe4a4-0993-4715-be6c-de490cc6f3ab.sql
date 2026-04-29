-- حذف سياسة القراءة القديمة التي تسمح للجميع
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;