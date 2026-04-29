-- Drop existing policy
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;

-- Create updated policy to include CustomerService role
CREATE POLICY "Create tasks" ON public.tasks
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) 
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR has_role(auth.uid(), 'CustomerService'::app_role)
);