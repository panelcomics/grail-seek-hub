-- Add favorites_total field to profiles table for caching seller favorites count
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorites_total integer DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_favorites_total ON profiles(favorites_total DESC);

-- Create function to calculate seller's total favorites
CREATE OR REPLACE FUNCTION calculate_seller_favorites(seller_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT f.id)::integer
  FROM favorites f
  INNER JOIN claim_sale_items csi ON f.listing_id = csi.id
  INNER JOIN claim_sales cs ON csi.claim_sale_id = cs.id
  WHERE cs.seller_id = seller_user_id;
$$;

-- Create function to update seller favorites total
CREATE OR REPLACE FUNCTION update_seller_favorites_total()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seller_record RECORD;
BEGIN
  FOR seller_record IN 
    SELECT DISTINCT cs.seller_id
    FROM claim_sales cs
  LOOP
    UPDATE profiles
    SET favorites_total = calculate_seller_favorites(seller_record.seller_id)
    WHERE user_id = seller_record.seller_id;
  END LOOP;
END;
$$;