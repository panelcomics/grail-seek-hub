-- Create usage_events table for privacy-respecting analytics
CREATE TABLE public.usage_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_name TEXT NOT NULL,
  user_id UUID,
  tier TEXT,
  metadata JSONB
);

-- Create index for efficient querying
CREATE INDEX idx_usage_events_created_at ON public.usage_events (created_at DESC);
CREATE INDEX idx_usage_events_event_name ON public.usage_events (event_name);

-- Enable RLS
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can insert (from edge functions or server)
CREATE POLICY "Service role can manage usage events"
ON public.usage_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Authenticated users can insert their own events
CREATE POLICY "Users can insert their own events"
ON public.usage_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Admins can view all events for analytics
CREATE POLICY "Admins can view all usage events"
ON public.usage_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add feature flag settings to app_settings if not exists
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('bulk_scan_enabled', 'true', 'Enable/disable Bulk Scan v2 feature'),
  ('scanner_assist_enabled', 'true', 'Enable/disable Scanner Assist feature'),
  ('analytics_enabled', 'true', 'Enable/disable usage analytics tracking')
ON CONFLICT (key) DO NOTHING;