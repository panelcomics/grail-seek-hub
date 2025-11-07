
-- Add details column to listings table
ALTER TABLE public.listings
ADD COLUMN details TEXT;

COMMENT ON COLUMN public.listings.details IS 'Optional field for significance, key details like "1st appearance", "signed", "variant", etc.';
