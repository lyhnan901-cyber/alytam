-- Create weekly time goals table
CREATE TABLE public.weekly_time_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_minutes INTEGER NOT NULL DEFAULT 2400, -- 40 hours default
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.weekly_time_goals ENABLE ROW LEVEL SECURITY;

-- Users can view their own goals
CREATE POLICY "Users can view own goals"
ON public.weekly_time_goals
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own goals
CREATE POLICY "Users can insert own goals"
ON public.weekly_time_goals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own goals
CREATE POLICY "Users can update own goals"
ON public.weekly_time_goals
FOR UPDATE
USING (auth.uid() = user_id);

-- Managers can view all goals
CREATE POLICY "Managers can view all goals"
ON public.weekly_time_goals
FOR SELECT
USING (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR 
  has_role(auth.uid(), 'Supervisor'::app_role)
);

-- Add updated_at trigger
CREATE TRIGGER update_weekly_time_goals_updated_at
BEFORE UPDATE ON public.weekly_time_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();