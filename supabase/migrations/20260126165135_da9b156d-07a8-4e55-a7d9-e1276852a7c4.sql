-- Add defect_notes column for tracking visible defects that buyers should know about
-- This is separate from restoration_markers which tracks professional restoration work
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS defect_notes TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.inventory_items.defect_notes IS 'Visible defects for buyer awareness: cover detached, tape, stains, ink marks, etc.';