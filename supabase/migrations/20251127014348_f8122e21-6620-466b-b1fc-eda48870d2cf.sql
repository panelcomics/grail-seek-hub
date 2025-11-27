-- ============================================================
-- Essential Schema Updates Only
-- ============================================================

-- Fix listings type constraint
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_type_check;

UPDATE listings 
SET type = CASE 
  WHEN type = 'fixed' THEN 'buy_now'
  WHEN type = 'auction' THEN 'auction'
  WHEN type = 'trade' THEN 'trade'
  ELSE 'buy_now'
END;

ALTER TABLE listings 
  ADD CONSTRAINT listings_type_check 
  CHECK (type IN ('buy_now', 'auction', 'trade'));

-- Add new columns to inventory_items (skip if exist)
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS volume_id text,
  ADD COLUMN IF NOT EXISTS issue_id text,
  ADD COLUMN IF NOT EXISTS cover_artist text,
  ADD COLUMN IF NOT EXISTS key_issue boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS key_details text,
  ADD COLUMN IF NOT EXISTS storage_location text;

-- Update images default without changing type
ALTER TABLE inventory_items 
  ALTER COLUMN images 
  SET DEFAULT '{"primary": null, "others": []}'::jsonb;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_inventory_items_volume_id ON inventory_items(volume_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_issue_id ON inventory_items(issue_id);