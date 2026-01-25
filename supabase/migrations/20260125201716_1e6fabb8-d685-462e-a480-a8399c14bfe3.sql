-- Create scan_events table for tracking scanner metrics
CREATE TABLE public.scan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  normalized_input TEXT NOT NULL,
  confidence INTEGER,
  strategy TEXT,
  source TEXT,
  rejected_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.scan_events ENABLE ROW LEVEL SECURITY;

-- Users can insert their own scan events
CREATE POLICY "Users can insert own scan events"
  ON public.scan_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only admins can view all scan events
CREATE POLICY "Admins can view all scan events"
  ON public.scan_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create index for time-based queries
CREATE INDEX idx_scan_events_created_at ON public.scan_events(created_at DESC);
CREATE INDEX idx_scan_events_source ON public.scan_events(source);
CREATE INDEX idx_scan_events_confidence ON public.scan_events(confidence);