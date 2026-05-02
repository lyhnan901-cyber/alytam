-- =====================================================================
-- نظام إدارة مهام مؤسسة اليتامى الخيرية التنموية
-- ملف الإنشاء الكامل لقاعدة البيانات (Bootstrap)
--
-- هذا الملف يجمع كل الـ migrations المتسلسلة في ملف واحد قابل للتشغيل
-- مرة واحدة على مشروع Supabase جديد لإنشاء كامل المخطط:
--   - الأنواع (Enums) - الجداول - الدوال - الـ Triggers
--   - Row Level Security (RLS) - Storage Bucket - بيانات افتراضية
--
-- طريقة الاستخدام (للفرع الجديد):
--   1) أنشئ مشروع Supabase جديد على https://supabase.com/dashboard
--   2) افتح SQL Editor واضغط New Query
--   3) الصق كامل محتوى هذا الملف ثم اضغط Run
--   4) خذ Project URL و anon key من Settings → API
--   5) ضع المتغيرات في إعدادات النشر (راجع supabase/README.md)
-- =====================================================================


-- ---------------------------------------------------------------------
-- المصدر: 20260108205953_13e80a5d-5da2-41f0-9a58-71b983b44936.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260108210025_0b6c767d-6081-4e6b-9002-2f95f26b056b.sql
-- ---------------------------------------------------------------------
-- Fix the search_path issue for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- المصدر: 20260108213919_f5adaa84-16e5-468b-ace0-11be943c1011.sql
-- ---------------------------------------------------------------------
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'task_assigned', 'status_changed', 'approval_required', 'info'
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  related_request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications (any authenticated user for task assignment)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ---------------------------------------------------------------------
-- المصدر: 20260108214746_aee45755-2f0c-4864-9031-fb516487baec.sql
-- ---------------------------------------------------------------------
-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- Allow users to view attachments for tasks they can access
CREATE POLICY "Users can view task attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------
-- المصدر: 20260108222317_dcd9bb7b-312a-4064-a72e-757d8859efd8.sql
-- ---------------------------------------------------------------------
-- Drop existing policy
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;

-- Create updated policy to include CustomerService role
CREATE POLICY "Create tasks" ON public.tasks
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) 
  OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR has_role(auth.uid(), 'CustomerService'::app_role)
);

-- ---------------------------------------------------------------------
-- المصدر: 20260109191120_f0b02d29-59c9-4c7d-a238-6ad12a6d83b6.sql
-- ---------------------------------------------------------------------
-- Create enum for field types
CREATE TYPE public.field_type AS ENUM ('text', 'number', 'date', 'select', 'boolean');

-- Create custom_fields table
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  field_type public.field_type NOT NULL DEFAULT 'text',
  applicable_to TEXT NOT NULL DEFAULT 'task',
  options JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create task_custom_field_values table
CREATE TABLE public.task_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value_text TEXT,
  value_number NUMERIC,
  value_date DATE,
  value_boolean BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, custom_field_id)
);

-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_fields
-- Everyone can view custom fields
CREATE POLICY "View custom fields"
ON public.custom_fields
FOR SELECT
USING (true);

-- Only GM can create custom fields
CREATE POLICY "Create custom fields"
ON public.custom_fields
FOR INSERT
WITH CHECK (is_general_manager(auth.uid()));

-- Only GM can update custom fields
CREATE POLICY "Update custom fields"
ON public.custom_fields
FOR UPDATE
USING (is_general_manager(auth.uid()));

-- Only GM can delete custom fields
CREATE POLICY "Delete custom fields"
ON public.custom_fields
FOR DELETE
USING (is_general_manager(auth.uid()));

-- RLS Policies for task_custom_field_values
-- View values for accessible tasks (same as task view policy)
CREATE POLICY "View custom field values"
ON public.task_custom_field_values
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_custom_field_values.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Insert values for tasks user can update
CREATE POLICY "Insert custom field values"
ON public.task_custom_field_values
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_custom_field_values.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Update values for tasks user can update
CREATE POLICY "Update custom field values"
ON public.task_custom_field_values
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_custom_field_values.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- RLS Policies for task_comments
-- View comments for accessible tasks
CREATE POLICY "View task comments"
ON public.task_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Any user who can view the task can add comments
CREATE POLICY "Insert task comments"
ON public.task_comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      is_general_manager(auth.uid())
      OR has_role(auth.uid(), 'ExecutiveManager'::app_role)
      OR has_role(auth.uid(), 'Supervisor'::app_role)
      OR (has_role(auth.uid(), 'DepartmentHead'::app_role) AND t.department_id = get_user_department(auth.uid()))
      OR t.assignee_id = auth.uid()
    )
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_custom_fields_updated_at
BEFORE UPDATE ON public.custom_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_custom_field_values_updated_at
BEFORE UPDATE ON public.task_custom_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- المصدر: 20260109192122_879068d7-2fa0-4302-9601-ef2edc4309bb.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260109194009_98385212-b295-4f8e-9d06-5b3036cbbf34.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260109201124_3985ed5b-ae55-48ab-8e24-0a4fe166c49c.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260109202716_4e5fdea6-dae6-49f2-bf09-57dfa6f348e9.sql
-- ---------------------------------------------------------------------
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
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'marketing_goal')
  AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'الميزانية التقديرية',
  'estimated_budget',
  'number'::field_type,
  'request',
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'estimated_budget')
  AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'المنصات المطلوبة',
  'required_platforms',
  'select'::field_type,
  'request',
  '["Instagram", "Facebook", "Twitter/X", "TikTok", "LinkedIn", "Google Ads", "Snapchat", "YouTube"]'::jsonb,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'required_platforms')
  AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'رابط الموقع/الحسابات',
  'website_accounts_url',
  'text'::field_type,
  'request',
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'website_accounts_url')
  AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

INSERT INTO public.custom_fields (name, key, field_type, applicable_to, options, created_by, is_active)
SELECT 
  'الفئة المستهدفة',
  'target_audience',
  'text'::field_type,
  'request',
  NULL,
  (SELECT id FROM auth.users LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM public.custom_fields WHERE key = 'target_audience')
  AND EXISTS (SELECT 1 FROM auth.users LIMIT 1);

-- ---------------------------------------------------------------------
-- المصدر: 20260109203936_05d64dfb-7d47-4a6c-b5ae-46eb93c8370c.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260109204928_963558c2-2eb2-4713-aaab-27471d16e48a.sql
-- ---------------------------------------------------------------------
-- ملاحظة (تعديل خاص بالـ bootstrap، غير موجود في الـ migration الأصلي):
-- الأقسام الستة التالية كانت مضافة يدوياً عبر Supabase Dashboard على المشروع
-- الأصلي قبل هذه الـ migration. لذلك UPDATEs/DELETE اللي بعدها كانت تشتغل
-- على بيانات موجودة. لما نشغّل bootstrap على قاعدة جديدة فاضية، الأقسام
-- مالها وجود أصلاً والـ UPDATEs ما تأثّر شيء فينتج فرع بقسمين فقط بدل
-- سبعة، وهذا يكسر توجيه المهام واستعلامات الصلاحيات. نضيف INSERT ابتدائي
-- بـ ON CONFLICT حتى يكون الفرع الجديد جاهزاً بسبعة أقسام مطابقة للفرع
-- الأصلي. مدير الفرع الجديد يقدر يعدّل الأسماء من واجهة المستخدم لاحقاً.
INSERT INTO public.departments (id, name, description, created_at, updated_at) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'المبيعات', 'قسم المبيعات', now(), now()),
  ('d1000000-0000-0000-0000-000000000002', 'التقنية', 'قسم التقنية', now(), now()),
  ('d1000000-0000-0000-0000-000000000003', 'الموارد البشرية', 'قسم الموارد البشرية', now(), now()),
  ('d1000000-0000-0000-0000-000000000004', 'المالية', 'قسم المالية', now(), now()),
  ('d1000000-0000-0000-0000-000000000005', 'العمليات', 'قسم العمليات', now(), now()),
  ('d1000000-0000-0000-0000-000000000006', 'خدمة العملاء', 'قسم خدمة العملاء', now(), now())
ON CONFLICT (id) DO NOTHING;

-- تحديث الأقسام الحالية لوكالة التسويق الإلكتروني

-- تحديث قسم التقنية إلى تطوير المواقع والمتاجر
UPDATE departments SET 
  name = 'تطوير المواقع والمتاجر',
  description = 'تطوير وبرمجة المواقع والمتاجر الإلكترونية',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000002';

-- تحديث قسم العمليات إلى الإعلانات الممولة
UPDATE departments SET 
  name = 'الإعلانات الممولة',
  description = 'إدارة الحملات الإعلانية المدفوعة على مختلف المنصات',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000005';

-- تحديث قسم المالية إلى الإدارة والاستراتيجية
UPDATE departments SET 
  name = 'الإدارة والاستراتيجية',
  description = 'التخطيط الاستراتيجي وإدارة الوكالة',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000004';

-- تحديث قسم المبيعات إلى المبيعات وخدمة العملاء
UPDATE departments SET 
  name = 'المبيعات وخدمة العملاء',
  description = 'إدارة المبيعات والتواصل مع العملاء',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000001';

-- تحديث قسم خدمة العملاء إلى إدارة السوشيال ميديا
UPDATE departments SET 
  name = 'إدارة السوشيال ميديا',
  description = 'إدارة حسابات التواصل الاجتماعي للعملاء',
  updated_at = now()
WHERE id = 'd1000000-0000-0000-0000-000000000006';

-- حذف قسم الموارد البشرية (لا يوجد موظفين مرتبطين)
DELETE FROM departments 
WHERE id = 'd1000000-0000-0000-0000-000000000003';

-- إضافة قسم المحتوى والتصميم
INSERT INTO departments (id, name, description, created_at, updated_at) VALUES
  (gen_random_uuid(), 'المحتوى والتصميم', 'إنشاء المحتوى الإبداعي والتصميم الجرافيكي', now(), now());

-- إضافة قسم تحسين محركات البحث (SEO)
INSERT INTO departments (id, name, description, created_at, updated_at) VALUES
  (gen_random_uuid(), 'تحسين محركات البحث (SEO)', 'تحسين ظهور المواقع في نتائج البحث', now(), now());

-- ---------------------------------------------------------------------
-- المصدر: 20260110055910_8eb25b14-5039-493a-b6d1-8f3fff45816a.sql
-- ---------------------------------------------------------------------
-- إضافة سياسة جديدة للسماح للمدير العام بتحديث أي profile
CREATE POLICY "GM can update any profile"
ON public.profiles
FOR UPDATE
USING (is_general_manager(auth.uid()));

-- ---------------------------------------------------------------------
-- المصدر: 20260110205843_45fd66be-28d4-48d4-a16b-42e5b1e0a3ba.sql
-- ---------------------------------------------------------------------
-- ==========================================
-- المرحلة 1: تقييد سياسة RLS للـ profiles
-- ==========================================

-- حذف السياسة الحالية التي تسمح للجميع بالقراءة
DROP POLICY IF EXISTS "View profiles" ON public.profiles;

-- إنشاء سياسة جديدة أكثر تقييداً
CREATE POLICY "View profiles based on role" ON public.profiles
FOR SELECT
USING (
  -- يمكن للمستخدم رؤية ملفه الشخصي
  auth.uid() = id
  OR
  -- المدراء والمشرفين يرون الجميع
  is_general_manager(auth.uid())
  OR
  has_role(auth.uid(), 'ExecutiveManager'::app_role)
  OR
  has_role(auth.uid(), 'Supervisor'::app_role)
  OR
  has_role(auth.uid(), 'CustomerService'::app_role)
  OR
  -- رئيس القسم يرى موظفي قسمه
  (
    has_role(auth.uid(), 'DepartmentHead'::app_role)
    AND department_id = get_user_department(auth.uid())
  )
  OR
  -- الموظف يرى زملاءه في نفس القسم
  (
    has_role(auth.uid(), 'Employee'::app_role)
    AND department_id = get_user_department(auth.uid())
  )
);

-- ==========================================
-- المرحلة 2: إنشاء جدول إعدادات المستخدم
-- ==========================================

CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ar',
  timezone TEXT NOT NULL DEFAULT 'asia_riyadh',
  dark_mode BOOLEAN NOT NULL DEFAULT false,
  animations_enabled BOOLEAN NOT NULL DEFAULT true,
  new_task_notifications BOOLEAN NOT NULL DEFAULT true,
  status_update_notifications BOOLEAN NOT NULL DEFAULT true,
  overdue_task_notifications BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_logout_minutes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: المستخدم يرى إعداداته فقط
CREATE POLICY "Users can view own settings" ON public.user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- سياسة الإدراج: المستخدم يضيف إعداداته فقط
CREATE POLICY "Users can insert own settings" ON public.user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- سياسة التحديث: المستخدم يعدل إعداداته فقط
CREATE POLICY "Users can update own settings" ON public.user_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger لتحديث updated_at تلقائياً
CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- المصدر: 20260110210025_555fe4a4-0993-4715-be6c-de490cc6f3ab.sql
-- ---------------------------------------------------------------------
-- حذف سياسة القراءة القديمة التي تسمح للجميع
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- ---------------------------------------------------------------------
-- المصدر: 20260127192436_7b756bd2-d2bc-4580-86ab-9e61fb1d1650.sql
-- ---------------------------------------------------------------------
-- حذف السياسة الحالية
DROP POLICY IF EXISTS "Create requests" ON public.requests;

-- إنشاء سياسة جديدة تتضمن المدير التنفيذي
CREATE POLICY "Create requests" ON public.requests
FOR INSERT TO authenticated
WITH CHECK (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'CustomerService') OR
  has_role(auth.uid(), 'ExecutiveManager')
);

-- ---------------------------------------------------------------------
-- المصدر: 20260128133625_5e2e8eea-f359-4676-849b-78d0c46f1d3d.sql
-- ---------------------------------------------------------------------
-- تحديث سياسة إنشاء الطلبات لتشمل المشرف
DROP POLICY IF EXISTS "Create requests" ON public.requests;

CREATE POLICY "Create requests" ON public.requests
FOR INSERT TO authenticated
WITH CHECK (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'CustomerService') OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'Supervisor')
);

-- تحديث سياسة إنشاء المهام لتشمل المشرف
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;

CREATE POLICY "Create tasks" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  is_general_manager(auth.uid()) OR
  has_role(auth.uid(), 'ExecutiveManager') OR
  has_role(auth.uid(), 'CustomerService') OR
  has_role(auth.uid(), 'Supervisor')
);

-- ---------------------------------------------------------------------
-- المصدر: 20260128133913_e424820f-25dc-4edb-9622-0826134012b3.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260129061607_eaa7b08b-891f-4917-92b2-34f75409d97f.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260130213003_7e0c3a15-12dc-42bc-ab87-5e582bc825ea.sql
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- المصدر: 20260202175957_04317e27-7db0-4dc3-9e09-f625fe695b77.sql
-- ---------------------------------------------------------------------
-- Update CREATE policy for requests to include DepartmentHead
DROP POLICY IF EXISTS "Create requests" ON public.requests;

CREATE POLICY "Create requests" ON public.requests
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR 
  has_role(auth.uid(), 'Supervisor'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);

-- Update UPDATE policy for requests to include DepartmentHead (scoped to their department)
DROP POLICY IF EXISTS "Update requests" ON public.requests;

CREATE POLICY "Update requests" ON public.requests
FOR UPDATE
USING (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR
  (
    has_role(auth.uid(), 'DepartmentHead'::app_role) AND
    (
      target_department_id = get_user_department(auth.uid()) OR
      EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.request_id = requests.id
        AND t.department_id = get_user_department(auth.uid())
      )
    )
  )
);

-- Update SELECT policy for requests to include DepartmentHead
DROP POLICY IF EXISTS "View requests based on role" ON public.requests;

CREATE POLICY "View requests based on role" ON public.requests
FOR SELECT
USING (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR 
  has_role(auth.uid(), 'Supervisor'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role) OR
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.request_id = requests.id
    AND (t.assignee_id = auth.uid() OR t.department_id = get_user_department(auth.uid()))
  )
);

-- Update INSERT policy for request_custom_field_values to include DepartmentHead
DROP POLICY IF EXISTS "Insert request custom field values" ON public.request_custom_field_values;

CREATE POLICY "Insert request custom field values" ON public.request_custom_field_values
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);

-- Update UPDATE policy for request_custom_field_values to include DepartmentHead
DROP POLICY IF EXISTS "Update request custom field values" ON public.request_custom_field_values;

CREATE POLICY "Update request custom field values" ON public.request_custom_field_values
FOR UPDATE
USING (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);

-- ---------------------------------------------------------------------
-- المصدر: 20260202182633_e4d91484-cd8e-40f6-868d-73f1729cdd4a.sql
-- ---------------------------------------------------------------------
-- Update CREATE policy for tasks to include DepartmentHead
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;

CREATE POLICY "Create tasks" ON public.tasks
FOR INSERT
WITH CHECK (
  is_general_manager(auth.uid()) OR 
  has_role(auth.uid(), 'ExecutiveManager'::app_role) OR 
  has_role(auth.uid(), 'CustomerService'::app_role) OR 
  has_role(auth.uid(), 'Supervisor'::app_role) OR
  has_role(auth.uid(), 'DepartmentHead'::app_role)
);

-- ---------------------------------------------------------------------
-- المصدر: 20260205053432_72c980b1-c438-4d6b-bd3a-a7eb21e26313.sql
-- ---------------------------------------------------------------------
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
])
ON CONFLICT (role) DO NOTHING;

-- ---------------------------------------------------------------------
-- المصدر: 20260207200637_5b3b19b4-9394-40cd-b4ba-b7c12195770c.sql
-- ---------------------------------------------------------------------
-- Allow GeneralManager and ExecutiveManager to delete requests
CREATE POLICY "Delete requests" 
ON public.requests 
FOR DELETE 
USING (is_general_manager(auth.uid()) OR has_role(auth.uid(), 'ExecutiveManager'::app_role));

-- Allow deleting tasks when parent request is deleted (for cascade delete)
CREATE POLICY "Delete tasks" 
ON public.tasks 
FOR DELETE 
USING (is_general_manager(auth.uid()) OR has_role(auth.uid(), 'ExecutiveManager'::app_role));

-- Allow deleting request custom field values
CREATE POLICY "Delete request custom field values" 
ON public.request_custom_field_values 
FOR DELETE 
USING (is_general_manager(auth.uid()) OR has_role(auth.uid(), 'ExecutiveManager'::app_role));
