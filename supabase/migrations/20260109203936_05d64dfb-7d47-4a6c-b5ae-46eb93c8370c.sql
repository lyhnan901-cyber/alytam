-- Create leads table for potential customers
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  estimated_value NUMERIC DEFAULT 0,
  interest TEXT[], -- Array of interests (e.g., SEO, Social Media, etc.)
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "View leads based on role"
ON public.leads FOR SELECT
USING (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'Supervisor') OR
  has_role(auth.uid(), 'CustomerService') OR
  assigned_to = auth.uid()
);

CREATE POLICY "Create leads"
ON public.leads FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'CustomerService')
);

CREATE POLICY "Update leads"
ON public.leads FOR UPDATE
USING (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'CustomerService') OR
  assigned_to = auth.uid()
);

CREATE POLICY "Delete leads"
ON public.leads FOR DELETE
USING (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'ExecutiveManager')
);

-- Create lead_activities table for tracking interactions
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- call, email, meeting, note
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for lead_activities
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View lead activities"
ON public.lead_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_activities.lead_id
    AND (
      is_general_manager(auth.uid()) OR
      has_role(auth.uid(), 'ExecutiveManager') OR
      has_role(auth.uid(), 'Supervisor') OR
      has_role(auth.uid(), 'CustomerService') OR
      l.assigned_to = auth.uid()
    )
  )
);

CREATE POLICY "Create lead activities"
ON public.lead_activities FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_activities.lead_id
    AND (
      is_general_manager(auth.uid()) OR
      has_role(auth.uid(), 'ExecutiveManager') OR
      has_role(auth.uid(), 'CustomerService') OR
      l.assigned_to = auth.uid()
    )
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();