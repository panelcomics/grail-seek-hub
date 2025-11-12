-- Verified Match Cache Table
CREATE TABLE IF NOT EXISTS public.verified_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL DEFAULT 'comicvine',
  source_id TEXT,
  title TEXT,
  issue TEXT,
  publisher TEXT,
  year INTEGER,
  variant_description TEXT,
  cover_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast hash lookups
CREATE INDEX IF NOT EXISTS idx_verified_matches_hash ON public.verified_matches(hash);
CREATE INDEX IF NOT EXISTS idx_verified_matches_created_at ON public.verified_matches(created_at DESC);

-- RLS Policies for verified_matches
ALTER TABLE public.verified_matches ENABLE ROW LEVEL SECURITY;

-- Anyone can read verified matches (for cache lookups)
CREATE POLICY "Anyone can read verified matches"
  ON public.verified_matches
  FOR SELECT
  USING (true);

-- Service role can insert verified matches
CREATE POLICY "Service role can insert verified matches"
  ON public.verified_matches
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Scanner Analytics Table
CREATE TABLE IF NOT EXISTS public.scanner_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT now(),
  session_id TEXT,
  user_id UUID,
  flow TEXT NOT NULL,
  action TEXT NOT NULL,
  duration_ms INTEGER,
  query TEXT,
  result_count INTEGER,
  selected_source TEXT,
  selected_score NUMERIC,
  notes TEXT
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_scanner_metrics_ts ON public.scanner_metrics(ts DESC);
CREATE INDEX IF NOT EXISTS idx_scanner_metrics_flow_action ON public.scanner_metrics(flow, action);
CREATE INDEX IF NOT EXISTS idx_scanner_metrics_session ON public.scanner_metrics(session_id);

-- RLS Policies for scanner_metrics
ALTER TABLE public.scanner_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can manage metrics
CREATE POLICY "Service role can manage metrics"
  ON public.scanner_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

-- GCD Index Table (scaffold for future)
CREATE TABLE IF NOT EXISTS public.gcd_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gcd_id TEXT UNIQUE,
  title TEXT,
  issue TEXT,
  publisher TEXT,
  year INTEGER,
  variant_description TEXT,
  cover_url TEXT,
  indexed_at TIMESTAMPTZ DEFAULT now()
);

-- Index for GCD lookups
CREATE INDEX IF NOT EXISTS idx_gcd_index_title ON public.gcd_index(title);
CREATE INDEX IF NOT EXISTS idx_gcd_index_issue ON public.gcd_index(issue);

-- RLS for gcd_index
ALTER TABLE public.gcd_index ENABLE ROW LEVEL SECURITY;

-- Anyone can read GCD index
CREATE POLICY "Anyone can read GCD index"
  ON public.gcd_index
  FOR SELECT
  USING (true);