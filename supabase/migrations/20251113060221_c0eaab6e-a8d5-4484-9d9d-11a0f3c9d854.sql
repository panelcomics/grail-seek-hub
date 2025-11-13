-- Add year column to inventory_items table
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS year integer;

COMMENT ON COLUMN public.inventory_items.year IS 'Publication year of the comic (e.g., 1984, 2023)';

-- Create index for year queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_year ON public.inventory_items(year) WHERE year IS NOT NULL;