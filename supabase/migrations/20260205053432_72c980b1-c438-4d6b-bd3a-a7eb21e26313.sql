-- Create role_permissions table to store permissions for each role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role UNIQUE NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can view role permissions
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Only GeneralManager can insert role permissions
CREATE POLICY "GM can insert role permissions"
ON public.role_permissions
FOR INSERT
WITH CHECK (is_general_manager(auth.uid()));

-- Only GeneralManager can update role permissions
CREATE POLICY "GM can update role permissions"
ON public.role_permissions
FOR UPDATE
USING (is_general_manager(auth.uid()));

-- Only GeneralManager can delete role permissions
CREATE POLICY "GM can delete role permissions"
ON public.role_permissions
FOR DELETE
USING (is_general_manager(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default permissions for all roles
INSERT INTO public.role_permissions (role, permissions) VALUES
-- GeneralManager gets ALL permissions
('GeneralManager', ARRAY[
  'dashboard_view',
  'requests_view', 'requests_create', 'requests_edit', 'requests_delete',
  'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_delete', 'tasks_assign',
  'users_view', 'users_create', 'users_edit', 'users_deactivate',
  'departments_view', 'departments_manage',
  'reports_view', 'reports_export',
  'leads_view', 'leads_create', 'leads_edit', 'leads_delete',
  'docs_view', 'docs_create', 'docs_edit', 'docs_delete',
  'settings_view', 'settings_manage',
  'announcements_manage',
  'activity_log_view',
  'permissions_manage'
]),
-- ExecutiveManager
('ExecutiveManager', ARRAY[
  'dashboard_view',
  'requests_view', 'requests_create', 'requests_edit',
  'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign',
  'users_view', 'users_create', 'users_edit',
  'departments_view',
  'reports_view', 'reports_export',
  'leads_view', 'leads_create', 'leads_edit', 'leads_delete',
  'docs_view', 'docs_create', 'docs_edit',
  'settings_view',
  'activity_log_view'
]),
-- Supervisor
('Supervisor', ARRAY[
  'dashboard_view',
  'requests_view', 'requests_create',
  'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign',
  'users_view',
  'departments_view',
  'reports_view', 'reports_export',
  'leads_view',
  'docs_view', 'docs_create',
  'settings_view',
  'activity_log_view'
]),
-- DepartmentHead
('DepartmentHead', ARRAY[
  'dashboard_view',
  'requests_view', 'requests_create',
  'tasks_view', 'tasks_create', 'tasks_edit', 'tasks_assign',
  'users_view',
  'departments_view',
  'reports_view',
  'leads_view',
  'docs_view', 'docs_create',
  'settings_view'
]),
-- CustomerService
('CustomerService', ARRAY[
  'dashboard_view',
  'requests_view', 'requests_create', 'requests_edit',
  'tasks_view', 'tasks_create',
  'leads_view', 'leads_create', 'leads_edit',
  'docs_view',
  'settings_view'
]),
-- Employee (minimal permissions)
('Employee', ARRAY[
  'dashboard_view',
  'tasks_view',
  'docs_view',
  'settings_view'
]);