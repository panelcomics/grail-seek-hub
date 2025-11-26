-- Add cover_artist field to inventory_items table for variant cover credits
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS cover_artist text;

-- Add comment explaining the field
COMMENT ON COLUMN inventory_items.cover_artist IS 'Cover artist name for variant covers (e.g., Alex Ross, J. Scott Campbell)';
