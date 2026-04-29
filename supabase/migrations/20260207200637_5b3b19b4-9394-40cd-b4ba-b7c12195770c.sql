-- Allow GeneralManager and ExecutiveManager to delete requests
CREATE POLICY "Delete requests" 
ON public.requests 
FOR DELETE 
USING (is_general_manager(auth.uid()) OR has_role(auth.uid(), 'ExecutiveManager'::app_role));

-- Allow deleting tasks when parent request is deleted (for cascade delete)
CREATE POLICY "Delete tasks" 
ON public.tasks 
FOR DELETE 
USING (is_general_manager(auth.uid()) OR has_role(auth.uid(), 'ExecutiveManager'::app_role));

-- Allow deleting request custom field values
CREATE POLICY "Delete request custom field values" 
ON public.request_custom_field_values 
FOR DELETE 
USING (is_general_manager(auth.uid()) OR has_role(auth.uid(), 'ExecutiveManager'::app_role));