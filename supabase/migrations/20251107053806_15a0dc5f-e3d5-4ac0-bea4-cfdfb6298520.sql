
-- Add details column to user_comics table
ALTER TABLE public.user_comics
ADD COLUMN details TEXT;

-- Add details column to inventory_items table
ALTER TABLE public.inventory_items
ADD COLUMN details TEXT;

-- Add details column to comics table
ALTER TABLE public.comics
ADD COLUMN details TEXT;

COMMENT ON COLUMN public.user_comics.details IS 'Optional field for significance, key details like "1st appearance", "signed", "variant", etc.';
COMMENT ON COLUMN public.inventory_items.details IS 'Optional field for significance, key details like "1st appearance", "signed", "variant", etc.';
COMMENT ON COLUMN public.comics.details IS 'Optional field for significance, key details like "1st appearance", "signed", "variant", etc.';
