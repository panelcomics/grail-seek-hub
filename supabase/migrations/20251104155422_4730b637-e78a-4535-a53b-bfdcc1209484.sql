-- Create shipping_tiers table
CREATE TABLE shipping_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0,
  min_items INTEGER NOT NULL DEFAULT 1,
  max_items INTEGER NOT NULL DEFAULT 999,
  country TEXT NOT NULL DEFAULT 'US',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_item_range CHECK (max_items >= min_items)
);

-- Enable RLS
ALTER TABLE shipping_tiers ENABLE ROW LEVEL SECURITY;

-- Sellers can manage their own tiers
CREATE POLICY "Sellers can manage their own tiers"
ON shipping_tiers
FOR ALL
USING (auth.uid() = seller_id);

-- Anyone can view tiers (for buyers to see shipping costs)
CREATE POLICY "Anyone can view shipping tiers"
ON shipping_tiers
FOR SELECT
USING (true);

-- Add indexes
CREATE INDEX idx_shipping_tiers_seller ON shipping_tiers(seller_id);

-- Add trigger for updated_at
CREATE TRIGGER update_shipping_tiers_updated_at
BEFORE UPDATE ON shipping_tiers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add shipping_tier_id to claim_sales
ALTER TABLE claim_sales ADD COLUMN shipping_tier_id UUID REFERENCES shipping_tiers(id) ON DELETE SET NULL;

-- Remove old shipping_amount column since it's now in the tier
ALTER TABLE claim_sales DROP COLUMN IF EXISTS shipping_amount;