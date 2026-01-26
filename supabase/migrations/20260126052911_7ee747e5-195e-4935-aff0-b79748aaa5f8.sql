-- Add restoration_markers JSONB column for tracking CGC purple-label style restoration
-- This stores an array of restoration types: color_touch, trimmed, tape, cleaned, piece_added, tear_sealed, staple_replaced
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS restoration_markers JSONB DEFAULT '[]'::jsonb;

-- Add index for restoration queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_restoration 
ON public.inventory_items USING gin(restoration_markers);

-- Add comment for documentation
COMMENT ON COLUMN public.inventory_items.restoration_markers IS 
'Array of restoration types detected on the comic. Values: color_touch, trimmed, tape, cleaned, piece_added, tear_sealed, staple_replaced, spine_roll_fix';