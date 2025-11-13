-- Add missing ComicVine and pricing columns to inventory_items table

-- ComicVine metadata columns
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS comicvine_volume_id text,
ADD COLUMN IF NOT EXISTS variant_description text,
ADD COLUMN IF NOT EXISTS volume_name text,
ADD COLUMN IF NOT EXISTS is_reprint boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS scanner_confidence numeric,
ADD COLUMN IF NOT EXISTS scanner_last_scanned_at timestamptz;

-- Pricing columns (from pricing-pipeline)
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS pricing_source text,
ADD COLUMN IF NOT EXISTS pricing_low numeric,
ADD COLUMN IF NOT EXISTS pricing_mid numeric,
ADD COLUMN IF NOT EXISTS pricing_high numeric,
ADD COLUMN IF NOT EXISTS pricing_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS pricing_last_refreshed_at timestamptz;

-- Add index for faster ComicVine lookups
CREATE INDEX IF NOT EXISTS idx_inventory_comicvine_issue ON inventory_items(comicvine_issue_id);
CREATE INDEX IF NOT EXISTS idx_inventory_comicvine_volume ON inventory_items(comicvine_volume_id);

-- Add comment explaining the schema
COMMENT ON COLUMN inventory_items.comicvine_volume_id IS 'ComicVine volume ID for series identification';
COMMENT ON COLUMN inventory_items.variant_description IS 'Variant cover description (e.g., "Variant A", "1:25 Incentive")';
COMMENT ON COLUMN inventory_items.scanner_confidence IS 'AI scanner match confidence score (0-100)';
COMMENT ON COLUMN inventory_items.pricing_source IS 'Source of pricing data: ebay, gcd, manual';
COMMENT ON COLUMN inventory_items.pricing_low IS 'Market floor price from pricing pipeline';
COMMENT ON COLUMN inventory_items.pricing_mid IS 'Market median price from pricing pipeline';
COMMENT ON COLUMN inventory_items.pricing_high IS 'Market ceiling price from pricing pipeline';