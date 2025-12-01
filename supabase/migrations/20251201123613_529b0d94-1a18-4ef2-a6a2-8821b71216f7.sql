-- Create enum for creator role types
CREATE TYPE public.creator_role_type AS ENUM ('artist', 'writer', 'both');

-- Create enum for application status
CREATE TYPE public.creator_application_status AS ENUM ('pending', 'approved', 'rejected');

-- Table: creator_applications
CREATE TABLE public.creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_requested creator_role_type NOT NULL,
  portfolio_links TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  status creator_application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_applications
CREATE POLICY "Users can view their own application"
  ON public.creator_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own application"
  ON public.creator_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending application"
  ON public.creator_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all applications"
  ON public.creator_applications
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all applications"
  ON public.creator_applications
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for creator_applications
CREATE INDEX idx_creator_applications_user_id ON public.creator_applications(user_id);
CREATE INDEX idx_creator_applications_status ON public.creator_applications(status);

-- Table: creator_roles
CREATE TABLE public.creator_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_artist BOOLEAN NOT NULL DEFAULT false,
  is_writer BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.creator_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_roles
CREATE POLICY "Users can view their own roles"
  ON public.creator_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.creator_roles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_creator_applications_updated_at
  BEFORE UPDATE ON public.creator_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();