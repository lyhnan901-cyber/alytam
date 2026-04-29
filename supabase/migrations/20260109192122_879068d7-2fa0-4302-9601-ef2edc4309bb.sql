-- Create automation_rules table
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_event TEXT NOT NULL,
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_json JSONB NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read, only GM can manage
CREATE POLICY "Anyone can view automation rules"
ON public.automation_rules
FOR SELECT
USING (true);

CREATE POLICY "GM can create automation rules"
ON public.automation_rules
FOR INSERT
WITH CHECK (is_general_manager(auth.uid()));

CREATE POLICY "GM can update automation rules"
ON public.automation_rules
FOR UPDATE
USING (is_general_manager(auth.uid()));

CREATE POLICY "GM can delete automation rules"
ON public.automation_rules
FOR DELETE
USING (is_general_manager(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_automation_rules_updated_at
BEFORE UPDATE ON public.automation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();