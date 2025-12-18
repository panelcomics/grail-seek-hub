-- Create scanner_match_logs table for debug logging
CREATE TABLE IF NOT EXISTS public.scanner_match_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  image_size_kb INTEGER,
  image_resolution TEXT,
  matched BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC(4,2),
  candidate_count INTEGER NOT NULL DEFAULT 0,
  ocr_text TEXT,
  extracted_title TEXT,
  extracted_issue TEXT,
  extracted_publisher TEXT,
  match_mode TEXT
);

-- Enable RLS
ALTER TABLE public.scanner_match_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only admins can read logs (using secure function)
CREATE POLICY "Admins can view scanner logs"
ON public.scanner_match_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own logs (no sensitive data exposed)
CREATE POLICY "Users can insert their own scanner logs"
ON public.scanner_match_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Index for faster admin queries
CREATE INDEX idx_scanner_match_logs_created_at ON public.scanner_match_logs(created_at DESC);
CREATE INDEX idx_scanner_match_logs_user_id ON public.scanner_match_logs(user_id);