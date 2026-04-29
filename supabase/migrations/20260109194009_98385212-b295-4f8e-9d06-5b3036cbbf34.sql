-- Create time_entries table for time tracking
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS for time_entries: Users can view their own entries
CREATE POLICY "Users can view own time entries"
ON public.time_entries FOR SELECT
USING (user_id = auth.uid());

-- GM/Executive/Supervisor can view all time entries
CREATE POLICY "Managers can view all time entries"
ON public.time_entries FOR SELECT
USING (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'Supervisor')
);

-- DeptHead can view department time entries
CREATE POLICY "DeptHead can view department time entries"
ON public.time_entries FOR SELECT
USING (
  has_role(auth.uid(), 'DepartmentHead') AND
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = time_entries.task_id
    AND t.department_id = get_user_department(auth.uid())
  )
);

-- Users can insert their own time entries
CREATE POLICY "Users can insert own time entries"
ON public.time_entries FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own time entries
CREATE POLICY "Users can update own time entries"
ON public.time_entries FOR UPDATE
USING (user_id = auth.uid());

-- Create docs table for internal documentation
CREATE TABLE public.docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  department_id uuid REFERENCES public.departments(id),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER update_docs_updated_at
  BEFORE UPDATE ON public.docs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for docs: View public docs
CREATE POLICY "View public docs"
ON public.docs FOR SELECT
USING (is_public = true);

-- View department-specific docs (private docs for department + GM + Executive)
CREATE POLICY "View department docs"
ON public.docs FOR SELECT
USING (
  is_public = false AND (
    is_general_manager(auth.uid()) OR
    has_role(auth.uid(), 'ExecutiveManager') OR
    (department_id IS NOT NULL AND get_user_department(auth.uid()) = department_id) OR
    (department_id IS NULL AND created_by = auth.uid())
  )
);

-- GM can create any docs
CREATE POLICY "GM can create docs"
ON public.docs FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) AND created_by = auth.uid()
);

-- DeptHead can create department docs
CREATE POLICY "DeptHead can create department docs"
ON public.docs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'DepartmentHead') AND
  created_by = auth.uid() AND
  (department_id = get_user_department(auth.uid()) OR department_id IS NULL OR is_public = true)
);

-- Executive can create docs
CREATE POLICY "Executive can create docs"
ON public.docs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'ExecutiveManager') AND created_by = auth.uid()
);

-- Update docs (creator or GM)
CREATE POLICY "Update own or GM docs"
ON public.docs FOR UPDATE
USING (
  created_by = auth.uid() OR
  is_general_manager(auth.uid())
);

-- Delete docs (GM only)
CREATE POLICY "GM can delete docs"
ON public.docs FOR DELETE
USING (is_general_manager(auth.uid()));