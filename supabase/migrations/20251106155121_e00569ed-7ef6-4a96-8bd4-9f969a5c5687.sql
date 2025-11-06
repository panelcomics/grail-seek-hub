-- Add suspended_at to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Create moderation_flags table
CREATE TABLE IF NOT EXISTS public.moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create app_settings table for feature toggles
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('allow_new_signups', 'true', 'Allow new user registrations'),
  ('marketplace_live', 'true', 'Enable marketplace functionality'),
  ('scanner_enabled', 'true', 'Enable comic scanner feature')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.moderation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation_flags
CREATE POLICY "Admins can view all flags"
  ON public.moderation_flags
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update flags"
  ON public.moderation_flags
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create flags"
  ON public.moderation_flags
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own flags"
  ON public.moderation_flags
  FOR SELECT
  USING (auth.uid() = reporter_id);

-- RLS Policies for app_settings
CREATE POLICY "Anyone can read settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON public.app_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at on moderation_flags
CREATE TRIGGER update_moderation_flags_updated_at
  BEFORE UPDATE ON public.moderation_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on app_settings
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.moderation_flags TO authenticated;