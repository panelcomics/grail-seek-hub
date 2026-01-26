-- Create scan_vision_usage table for tracking vision matching costs
CREATE TABLE public.scan_vision_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_event_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('auto_low_confidence', 'multiple_candidates', 'user_correction')),
  candidates_compared INTEGER NOT NULL DEFAULT 0,
  similarity_score NUMERIC(5, 4),
  matched_comic_id INTEGER,
  matched_title TEXT,
  vision_override_applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient monthly queries
CREATE INDEX idx_scan_vision_usage_created_at ON public.scan_vision_usage (created_at DESC);
CREATE INDEX idx_scan_vision_usage_user_id ON public.scan_vision_usage (user_id);

-- Enable RLS
ALTER TABLE public.scan_vision_usage ENABLE ROW LEVEL SECURITY;

-- Admin can view all usage
CREATE POLICY "Admins can view all vision usage"
ON public.scan_vision_usage
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own usage
CREATE POLICY "Users can view own vision usage"
ON public.scan_vision_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Only backend can insert (service role)
CREATE POLICY "Service role can insert vision usage"
ON public.scan_vision_usage
FOR INSERT
WITH CHECK (true);

-- Create vision_settings table for config
CREATE TABLE public.vision_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default monthly limit
INSERT INTO public.vision_settings (key, value, description) VALUES
  ('monthly_limit', '5000', 'Maximum vision matching requests per month'),
  ('enabled', 'true', 'Whether vision matching is enabled');

-- Enable RLS on settings
ALTER TABLE public.vision_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage settings
CREATE POLICY "Admins can manage vision settings"
ON public.vision_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can read settings
CREATE POLICY "Anyone can read vision settings"
ON public.vision_settings
FOR SELECT
USING (true);

-- Create function to get monthly vision usage count
CREATE OR REPLACE FUNCTION public.get_monthly_vision_usage()
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM scan_vision_usage
  WHERE created_at >= date_trunc('month', now());
$$;

-- Create function to check if vision is available (under monthly limit)
CREATE OR REPLACE FUNCTION public.is_vision_available()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT value::BOOLEAN FROM vision_settings WHERE key = 'enabled')
    AND
    (public.get_monthly_vision_usage() < (SELECT value::INTEGER FROM vision_settings WHERE key = 'monthly_limit'));
$$;