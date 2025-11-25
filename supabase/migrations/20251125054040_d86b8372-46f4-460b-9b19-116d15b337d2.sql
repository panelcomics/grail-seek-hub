-- Add sold off-platform tracking fields to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sold_off_platform BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sold_off_platform_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sold_off_platform_channel TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN inventory_items.sold_off_platform IS 'Indicates if item was sold outside GrailSeeker platform (no fees charged)';
COMMENT ON COLUMN inventory_items.sold_off_platform_date IS 'Timestamp when item was marked as sold off-platform';
COMMENT ON COLUMN inventory_items.sold_off_platform_channel IS 'Channel where item was sold (e.g., Facebook group, Instagram, Local show)';

-- Create index for querying sold off-platform items
CREATE INDEX IF NOT EXISTS idx_inventory_items_sold_off_platform ON inventory_items(sold_off_platform) WHERE sold_off_platform = true;