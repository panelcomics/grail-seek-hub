-- Add variant fields to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS variant_type text,
ADD COLUMN IF NOT EXISTS variant_details text;

-- Create index for variant_type for filtering
CREATE INDEX IF NOT EXISTS idx_inventory_items_variant_type ON inventory_items(variant_type);

-- Add comment for documentation
COMMENT ON COLUMN inventory_items.variant_type IS 'Type of variant edition (Direct, Newsstand, Second Printing, etc.)';
COMMENT ON COLUMN inventory_items.variant_details IS 'Additional details about the variant edition';