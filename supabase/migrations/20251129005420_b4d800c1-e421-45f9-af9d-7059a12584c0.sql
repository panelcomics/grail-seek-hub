-- Add location fields to profiles table for Local Deals feature
-- These fields are nullable to avoid breaking existing profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS lat numeric(10, 7),
ADD COLUMN IF NOT EXISTS lng numeric(10, 7);

-- Add index on lat/lng for distance queries
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Add index on postal_code for geocoding lookups
CREATE INDEX IF NOT EXISTS idx_profiles_postal_code ON public.profiles(postal_code) WHERE postal_code IS NOT NULL;

COMMENT ON COLUMN public.profiles.city IS 'User city for local deals';
COMMENT ON COLUMN public.profiles.state IS 'User state/province for local deals';
COMMENT ON COLUMN public.profiles.country IS 'User country code (e.g., US)';
COMMENT ON COLUMN public.profiles.postal_code IS 'User ZIP/postal code for local deals';
COMMENT ON COLUMN public.profiles.lat IS 'Geocoded latitude from postal_code';
COMMENT ON COLUMN public.profiles.lng IS 'Geocoded longitude from postal_code';