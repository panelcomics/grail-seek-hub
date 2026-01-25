-- Create scan_corrections table for storing user corrections
-- This enables learning from user feedback to improve future scans
CREATE TABLE public.scan_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  input_text TEXT NOT NULL,
  normalized_input TEXT NOT NULL,
  selected_comicvine_id INTEGER NOT NULL,
  selected_volume_id INTEGER,
  selected_title TEXT NOT NULL,
  selected_issue TEXT,
  selected_year INTEGER,
  selected_publisher TEXT,
  selected_cover_url TEXT,
  ocr_text TEXT,
  original_confidence INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for fast lookups by normalized input
CREATE INDEX idx_scan_corrections_normalized_input ON public.scan_corrections(normalized_input);
CREATE INDEX idx_scan_corrections_user_id ON public.scan_corrections(user_id);
CREATE INDEX idx_scan_corrections_created_at ON public.scan_corrections(created_at DESC);

-- Enable RLS
ALTER TABLE public.scan_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own corrections
CREATE POLICY "Users can insert own corrections"
ON public.scan_corrections
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own corrections
CREATE POLICY "Users can view own corrections"
ON public.scan_corrections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can view all corrections (for training data)
CREATE POLICY "Admins can view all corrections"
ON public.scan_corrections
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));