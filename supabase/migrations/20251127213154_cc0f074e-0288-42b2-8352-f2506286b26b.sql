-- Add rotation field to inventory_items
ALTER TABLE inventory_items 
ADD COLUMN primary_image_rotation integer DEFAULT 0;

COMMENT ON COLUMN inventory_items.primary_image_rotation IS 'Rotation in degrees: 0, 90, 180, or 270';