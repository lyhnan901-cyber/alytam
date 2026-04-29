-- Create table for request custom field values
CREATE TABLE public.request_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_id, custom_field_id)
);

-- Enable RLS
ALTER TABLE public.request_custom_field_values ENABLE ROW LEVEL SECURITY;

-- View policy - users who can view the request can view its custom fields
CREATE POLICY "View request custom field values"
ON public.request_custom_field_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = request_custom_field_values.request_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'CustomerService'::app_role)
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.request_id = r.id
        AND (t.assignee_id = auth.uid() OR t.department_id = get_user_department(auth.uid()))
      )
    )
  )
);

-- Insert policy
CREATE POLICY "Insert request custom field values"
ON public.request_custom_field_values
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid())
  OR has_role(auth.uid(), 'CustomerService'::app_role)
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
);

-- Update policy
CREATE POLICY "Update request custom field values"
ON public.request_custom_field_values
FOR UPDATE
USING (
  is_general_manager(auth.uid())
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
);

-- Insert default marketing custom fields for requests
INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'الهدف التسويقي',
  'marketing_goal',
  'select'::field_type,
  'request',
  '["زيادة المبيعات", "زيادة الوعي بالعلامة", "جذب عملاء جدد", "تحسين السمعة", "زيادة التفاعل", "إطلاق منتج جديد"]'::jsonb,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'marketing_goal');

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'الميزانية التقديرية',
  'estimated_budget',
  'number'::field_type,
  'request',
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'estimated_budget');

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'المنصات المطلوبة',
  'required_platforms',
  'select'::field_type,
  'request',
  '["Instagram", "Facebook", "Twitter/X", "TikTok", "LinkedIn", "Google Ads", "Snapchat", "YouTube"]'::jsonb,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'required_platforms');

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'رابط الموقع/الحسابات',
  'website_accounts_url',
  'text'::field_type,
  'request',
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'website_accounts_url');

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'الفئة المستهدفة',
  'target_audience',
  'text'::field_type,
  'request',
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'target_audience');