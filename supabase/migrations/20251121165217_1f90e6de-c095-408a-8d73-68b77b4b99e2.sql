-- Make comic_id nullable in listings table since app now uses inventory_item_id
-- This allows listings to be created without the legacy comic_id field
ALTER TABLE listings ALTER COLUMN comic_id DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN listings.comic_id IS 'Legacy field - now optional. Use inventory_item_id instead.';