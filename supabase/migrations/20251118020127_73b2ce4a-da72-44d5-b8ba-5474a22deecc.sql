-- Add writer and artist columns to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS writer TEXT,
ADD COLUMN IF NOT EXISTS artist TEXT;

COMMENT ON COLUMN public.inventory_items.writer IS 'Primary writer credit from ComicVine';
COMMENT ON COLUMN public.inventory_items.artist IS 'Primary artist credit from ComicVine';