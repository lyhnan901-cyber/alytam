-- Update CREATE policy for tasks to include DepartmentHead
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;

CREATE POLICY "Create tasks" ON public.tasks
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'Supervisor'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);