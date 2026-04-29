-- Add columns for internal requests support
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS request_source text NOT NULL DEFAULT 'client',
ADD COLUMN IF NOT EXISTS target_department_id uuid REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS requested_by_name text;

-- Add constraint to validate request_source values
ALTER TABLE public.requests 
ADD CONSTRAINT check_request_source CHECK (request_source IN ('client', 'internal'));

-- Update client_name to be nullable for internal requests (will use requested_by_name instead)
ALTER TABLE public.requests ALTER COLUMN client_name DROP NOT NULL;

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_requests_source ON public.requests(request_source);

-- Comment for documentation
COMMENT ON COLUMN public.requests.request_source IS 'Source of request: client (external customer) or internal (employee task request)';
COMMENT ON COLUMN public.requests.target_department_id IS 'Target department for internal requests';
COMMENT ON COLUMN public.requests.requested_by_name IS 'Name of employee who requested (for internal requests)';