-- Add art category fields to claim_sale_items
ALTER TABLE claim_sale_items 
ADD COLUMN IF NOT EXISTS subcategory text,
ADD COLUMN IF NOT EXISTS is_creator_owner boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_original_physical boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_coa boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS coa_file_url text,
ADD COLUMN IF NOT EXISTS authenticity_flagged boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS flagged_reason text,
ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS flagged_by uuid;

-- Add check constraint for art subcategories
ALTER TABLE claim_sale_items
ADD CONSTRAINT valid_art_subcategory CHECK (
  category != 'art' OR subcategory IN ('published_pages', 'covers', 'commissions', 'fan_art')
);

-- Create notification for art listing flags
CREATE TABLE IF NOT EXISTS art_listing_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES claim_sale_items(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE art_listing_flags ENABLE ROW LEVEL SECURITY;

-- Admins can view all flags
CREATE POLICY "Admins can view all art flags"
ON art_listing_flags
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can create flags
CREATE POLICY "Admins can flag art listings"
ON art_listing_flags
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add index for faster art listing queries
CREATE INDEX IF NOT EXISTS idx_claim_sale_items_category_art ON claim_sale_items(category) WHERE category = 'art';
CREATE INDEX IF NOT EXISTS idx_claim_sale_items_authenticity_flagged ON claim_sale_items(authenticity_flagged) WHERE authenticity_flagged = true;