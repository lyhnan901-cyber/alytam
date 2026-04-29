-- Update CREATE policy for requests to include DepartmentHead
DROP POLICY IF EXISTS "Create requests" ON public.requests;

CREATE POLICY "Create requests" ON public.requests
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR 
  has_role(auth.uid(), 'Supervisor'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);

-- Update UPDATE policy for requests to include DepartmentHead (scoped to their department)
DROP POLICY IF EXISTS "Update requests" ON public.requests;

CREATE POLICY "Update requests" ON public.requests
FOR UPDATE
USING (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR
  (
    has_role(auth.uid(), 'DepartmentHead'::app_role) AND
    (
      target_department_id = get_user_department(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.request_id = requests.id
        AND t.department_id = get_user_department(auth.uid())
      )
    )
  )
);

-- Update SELECT policy for requests to include DepartmentHead
DROP POLICY IF EXISTS "View requests based on role" ON public.requests;

CREATE POLICY "View requests based on role" ON public.requests
FOR SELECT
USING (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR 
  has_role(auth.uid(), 'Supervisor'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role) OR
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.request_id = requests.id
    AND (t.assignee_id = auth.uid() OR t.department_id = get_user_department(auth.uid()))
  )
);

-- Update INSERT policy for request_custom_field_values to include DepartmentHead
DROP POLICY IF EXISTS "Insert request custom field values" ON public.request_custom_field_values;

CREATE POLICY "Insert request custom field values" ON public.request_custom_field_values
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);

-- Update UPDATE policy for request_custom_field_values to include DepartmentHead
DROP POLICY IF EXISTS "Update request custom field values" ON public.request_custom_field_values;

CREATE POLICY "Update request custom field values" ON public.request_custom_field_values
FOR UPDATE
USING (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);