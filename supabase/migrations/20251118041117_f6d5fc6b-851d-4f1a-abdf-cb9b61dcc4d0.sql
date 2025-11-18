-- Enable pg_trgm extension for fuzzy search first
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create comicvine_volumes table
CREATE TABLE IF NOT EXISTS public.comicvine_volumes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  publisher TEXT,
  start_year INTEGER,
  issue_count INTEGER DEFAULT 0,
  deck TEXT,
  image_url TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create basic indexes for volumes
CREATE INDEX IF NOT EXISTS idx_comicvine_volumes_slug ON public.comicvine_volumes(slug);
CREATE INDEX IF NOT EXISTS idx_comicvine_volumes_publisher ON public.comicvine_volumes(publisher);
CREATE INDEX IF NOT EXISTS idx_comicvine_volumes_start_year ON public.comicvine_volumes(start_year);

-- Create trigram index for fuzzy name search
CREATE INDEX IF NOT EXISTS idx_comicvine_volumes_name_trgm ON public.comicvine_volumes USING gin(name gin_trgm_ops);

-- Create comicvine_issues table
CREATE TABLE IF NOT EXISTS public.comicvine_issues (
  id INTEGER PRIMARY KEY,
  volume_id INTEGER NOT NULL REFERENCES public.comicvine_volumes(id) ON DELETE CASCADE,
  issue_number TEXT,
  name TEXT,
  cover_date DATE,
  image_url TEXT,
  writer TEXT,
  artist TEXT,
  key_notes TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for issues
CREATE INDEX IF NOT EXISTS idx_comicvine_issues_volume_id ON public.comicvine_issues(volume_id);
CREATE INDEX IF NOT EXISTS idx_comicvine_issues_issue_number ON public.comicvine_issues(issue_number);
CREATE INDEX IF NOT EXISTS idx_comicvine_issues_cover_date ON public.comicvine_issues(cover_date);

-- Enable RLS (mostly public read)
ALTER TABLE public.comicvine_volumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comicvine_issues ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view volumes" ON public.comicvine_volumes FOR SELECT USING (true);
CREATE POLICY "Anyone can view issues" ON public.comicvine_issues FOR SELECT USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage volumes" ON public.comicvine_volumes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can manage issues" ON public.comicvine_issues FOR ALL USING (auth.role() = 'service_role');