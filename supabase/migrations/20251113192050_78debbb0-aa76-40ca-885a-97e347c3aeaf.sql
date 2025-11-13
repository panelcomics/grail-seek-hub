-- Add variant and key issue metadata to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS variant_notes text,
ADD COLUMN IF NOT EXISTS is_key boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS key_type text;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_key ON inventory_items(is_key);
CREATE INDEX IF NOT EXISTS idx_inventory_items_key_type ON inventory_items(key_type);

-- Add comments for documentation
COMMENT ON COLUMN inventory_items.variant_notes IS 'Free-form notes about variant details (e.g., "Campbell Virgin Variant", "Diamond Retailer Incentive")';
COMMENT ON COLUMN inventory_items.is_key IS 'Whether this is a key issue';
COMMENT ON COLUMN inventory_items.key_type IS 'Type of key issue: Major Key, Minor Key, First Appearance, Cameo, Origin, Death, Other';