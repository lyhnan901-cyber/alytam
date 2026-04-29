-- Create enum types for the application
CREATE TYPE public.app_role AS ENUM (
  'GeneralManager',
  'CustomerService', 
  'ExecutiveManager',
  'Supervisor',
  'DepartmentHead',
  'Employee'
);

CREATE TYPE public.request_status AS ENUM (
  'New',
  'InProgress',
  'Completed',
  'Closed'
);

CREATE TYPE public.request_priority AS ENUM (
  'High',
  'Medium',
  'Low'
);

CREATE TYPE public.task_status AS ENUM (
  'New',
  'NotStarted',
  'InProgress',
  'Completed',
  'PendingDeptHeadReview',
  'PendingSupervisorReview',
  'PendingExecutiveReview',
  'PendingGMApproval',
  'Approved',
  'NeedRevision',
  'Rejected'
);

CREATE TYPE public.task_level AS ENUM (
  'Executive',
  'Supervisor',
  'DeptHead',
  'Employee'
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  department_id UUID REFERENCES public.departments(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create requests table
CREATE TABLE public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number SERIAL,
  client_name TEXT NOT NULL,
  request_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'phone',
  priority request_priority NOT NULL DEFAULT 'Medium',
  status request_status NOT NULL DEFAULT 'New',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number SERIAL,
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id),
  assignee_id UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  level task_level NOT NULL DEFAULT 'Executive',
  status task_status NOT NULL DEFAULT 'New',
  priority request_priority NOT NULL DEFAULT 'Medium',
  start_date DATE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_history table for workflow tracking
CREATE TABLE public.task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_status task_status,
  to_status task_status NOT NULL,
  from_level task_level,
  to_level task_level,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_roles.user_id = $1 LIMIT 1;
$$;

-- Security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Security definer function to check if user is GeneralManager
CREATE OR REPLACE FUNCTION public.is_general_manager(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'GeneralManager'
  );
$$;

-- Security definer function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.profiles WHERE id = _user_id;
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles policies (only GM can manage roles)
CREATE POLICY "Users can view roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "GM can insert roles" ON public.user_roles
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_general_manager(auth.uid()));

CREATE POLICY "GM can update roles" ON public.user_roles
  FOR UPDATE TO authenticated 
  USING (public.is_general_manager(auth.uid()));

CREATE POLICY "GM can delete roles" ON public.user_roles
  FOR DELETE TO authenticated 
  USING (public.is_general_manager(auth.uid()));

-- Departments policies
CREATE POLICY "Anyone can view departments" ON public.departments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "GM can manage departments" ON public.departments
  FOR ALL TO authenticated 
  USING (public.is_general_manager(auth.uid()));

-- Requests policies
CREATE POLICY "View requests based on role" ON public.requests
  FOR SELECT TO authenticated
  USING (
    public.is_general_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'CustomerService') OR
    public.has_role(auth.uid(), 'ExecutiveManager') OR
    public.has_role(auth.uid(), 'Supervisor') OR
    -- DeptHead and Employee see requests that have tasks in their department
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.request_id = requests.id
      AND (
        t.assignee_id = auth.uid() OR
        t.department_id = public.get_user_department(auth.uid())
      )
    )
  );

CREATE POLICY "Create requests" ON public.requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_general_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'CustomerService')
  );

CREATE POLICY "Update requests" ON public.requests
  FOR UPDATE TO authenticated
  USING (
    public.is_general_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'ExecutiveManager')
  );

-- Tasks policies
CREATE POLICY "View tasks based on role" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.is_general_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'ExecutiveManager') OR
    public.has_role(auth.uid(), 'Supervisor') OR
    (public.has_role(auth.uid(), 'DepartmentHead') AND department_id = public.get_user_department(auth.uid())) OR
    assignee_id = auth.uid()
  );

CREATE POLICY "Create tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_general_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'ExecutiveManager')
  );

CREATE POLICY "Update tasks based on role" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_general_manager(auth.uid()) OR
    public.has_role(auth.uid(), 'ExecutiveManager') OR
    public.has_role(auth.uid(), 'Supervisor') OR
    (public.has_role(auth.uid(), 'DepartmentHead') AND department_id = public.get_user_department(auth.uid())) OR
    assignee_id = auth.uid()
  );

-- Attachments policies
CREATE POLICY "View attachments for accessible tasks" ON public.attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (
        public.is_general_manager(auth.uid()) OR
        public.has_role(auth.uid(), 'ExecutiveManager') OR
        public.has_role(auth.uid(), 'Supervisor') OR
        t.assignee_id = auth.uid() OR
        t.department_id = public.get_user_department(auth.uid())
      )
    )
  );

CREATE POLICY "Upload attachments" ON public.attachments
  FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Task history policies
CREATE POLICY "View task history for accessible tasks" ON public.task_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_id AND (
        public.is_general_manager(auth.uid()) OR
        public.has_role(auth.uid(), 'ExecutiveManager') OR
        public.has_role(auth.uid(), 'Supervisor') OR
        t.assignee_id = auth.uid() OR
        t.department_id = public.get_user_department(auth.uid())
      )
    )
  );

CREATE POLICY "Insert task history" ON public.task_history
  FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_department ON public.profiles(department_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_requests_status ON public.requests(status);
CREATE INDEX idx_requests_created_by ON public.requests(created_by);
CREATE INDEX idx_tasks_request ON public.tasks(request_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_department ON public.tasks(department_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_level ON public.tasks(level);
CREATE INDEX idx_attachments_task ON public.attachments(task_id);
CREATE INDEX idx_task_history_task ON public.task_history(task_id);