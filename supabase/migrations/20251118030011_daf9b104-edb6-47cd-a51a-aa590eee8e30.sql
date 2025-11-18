-- Create user_scan_history table for persisting scanner selections
CREATE TABLE IF NOT EXISTS public.user_scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  image_url TEXT NOT NULL,
  comicvine_issue_id INTEGER,
  comicvine_cover_url TEXT,
  title TEXT NOT NULL,
  issue_number TEXT,
  publisher TEXT,
  year INTEGER,
  writer TEXT,
  artist TEXT,
  key_notes TEXT
);

-- Create index for faster queries
CREATE INDEX idx_user_scan_history_user_id_created ON public.user_scan_history(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.user_scan_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own scan history
CREATE POLICY "Users can view their own scan history"
  ON public.user_scan_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own scan history
CREATE POLICY "Users can insert their own scan history"
  ON public.user_scan_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scan history
CREATE POLICY "Users can delete their own scan history"
  ON public.user_scan_history
  FOR DELETE
  USING (auth.uid() = user_id);