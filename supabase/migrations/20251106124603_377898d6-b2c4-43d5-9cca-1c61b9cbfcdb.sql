-- Create scan_cache table for caching Vision + ComicVine results
CREATE TABLE IF NOT EXISTS public.scan_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  image_sha256 TEXT UNIQUE NOT NULL,
  ocr TEXT,
  comicvine_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_scan_cache_sha256 ON public.scan_cache(image_sha256);
CREATE INDEX IF NOT EXISTS idx_scan_cache_created_at ON public.scan_cache(created_at);

-- Enable RLS but allow service role access (function will use service role)
ALTER TABLE public.scan_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage scan cache"
ON public.scan_cache
FOR ALL
USING (auth.role() = 'service_role');

-- Create scan_rate_limits table for rate limiting
CREATE TABLE IF NOT EXISTS public.scan_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address TEXT,
  scan_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_scan_rate_limits_user_id ON public.scan_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_rate_limits_ip_address ON public.scan_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_scan_rate_limits_window_start ON public.scan_rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.scan_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage rate limits"
ON public.scan_rate_limits
FOR ALL
USING (auth.role() = 'service_role');

-- Trigger for scan_rate_limits updated_at
CREATE TRIGGER update_scan_rate_limits_updated_at
BEFORE UPDATE ON public.scan_rate_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();