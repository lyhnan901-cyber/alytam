-- Create enum for field types
CREATE TYPE public.field_type AS ENUM ('text', 'number', 'date', 'select', 'boolean');

-- Create custom_fields table
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  field_type public.field_type NOT NULL DEFAULT 'text',
  applicable_to TEXT NOT NULL DEFAULT 'task',
  options JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_custom_field_values table
CREATE TABLE public.task_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, custom_field_id)
);

-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_fields
-- Everyone can view custom fields
CREATE POLICY "View custom fields"
ON public.custom_fields
FOR SELECT
USING (true);

-- Only GM can create custom fields
CREATE POLICY "Create custom fields"
ON public.custom_fields
FOR INSERT
WITH CHECK (is_general_manager(auth.uid()));

-- Only GM can update custom fields
CREATE POLICY "Update custom fields"
ON public.custom_fields
FOR UPDATE
USING (is_general_manager(auth.uid()));

-- Only GM can delete custom fields
CREATE POLICY "Delete custom fields"
ON public.custom_fields
FOR DELETE
USING (is_general_manager(auth.uid()));

-- RLS Policies for task_custom_field_values
-- View values for accessible tasks (same as task view policy)
CREATE POLICY "View custom field values"
ON public.task_custom_field_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_custom_field_values.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Insert values for tasks user can update
CREATE POLICY "Insert custom field values"
ON public.task_custom_field_values
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_custom_field_values.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Update values for tasks user can update
CREATE POLICY "Update custom field values"
ON public.task_custom_field_values
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_custom_field_values.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- RLS Policies for task_comments
-- View comments for accessible tasks
CREATE POLICY "View task comments"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Any user who can view the task can add comments
CREATE POLICY "Insert task comments"
ON public.task_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_custom_fields_updated_at
BEFORE UPDATE ON public.custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_custom_field_values_updated_at
BEFORE UPDATE ON public.task_custom_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();