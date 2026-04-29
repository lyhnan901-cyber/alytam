-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_title text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user's department from activity context
CREATE OR REPLACE FUNCTION public.get_activity_user_department(_activity_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = _activity_user_id;
$$;

-- RLS Policies
-- Users can view their own activities
CREATE POLICY "Users can view own activities"
ON public.activity_logs
FOR SELECT
USING (user_id = auth.uid());

-- Department heads can view activities of their department members
CREATE POLICY "DeptHead can view department activities"
ON public.activity_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'DepartmentHead'::app_role) 
  AND get_activity_user_department(user_id) = get_user_department(auth.uid())
);

-- Managers can view all activities
CREATE POLICY "Managers can view all activities"
ON public.activity_logs
FOR SELECT
USING (
  is_general_manager(auth.uid()) 
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role) 
  OR has_role(auth.uid(), 'Supervisor'::app_role)
);

-- Any authenticated user can insert their own activities
CREATE POLICY "Users can insert own activities"
ON public.activity_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());