-- Create announcements table
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Everyone can view active announcements
CREATE POLICY "Anyone can view active announcements"
ON public.announcements
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Only GM can create announcements
CREATE POLICY "GM can create announcements"
ON public.announcements
FOR INSERT
WITH CHECK (is_general_manager(auth.uid()) AND created_by = auth.uid());

-- Only GM can update announcements
CREATE POLICY "GM can update announcements"
ON public.announcements
FOR UPDATE
USING (is_general_manager(auth.uid()));

-- Only GM can delete announcements
CREATE POLICY "GM can delete announcements"
ON public.announcements
FOR DELETE
USING (is_general_manager(auth.uid()));

-- GM can also view all announcements (including inactive)
CREATE POLICY "GM can view all announcements"
ON public.announcements
FOR SELECT
USING (is_general_manager(auth.uid()));