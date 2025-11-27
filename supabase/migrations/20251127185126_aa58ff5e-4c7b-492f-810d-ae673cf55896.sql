-- Remove "Debug Location" from any existing inventory items
UPDATE inventory_items 
SET storage_location = NULL 
WHERE storage_location = 'Debug Location';

-- Add index on inventory_items.user_id for My Collection performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items(user_id);