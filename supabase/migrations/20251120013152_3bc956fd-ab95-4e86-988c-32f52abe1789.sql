-- Set up Premium Featured Dealer tier for Panel Comics and Kiss Komixx

-- First, find and update Panel Comics profile
UPDATE profiles
SET 
  seller_tier = 'premium',
  custom_fee_rate = 0.0,
  is_featured_seller = true,
  is_verified_seller = true
WHERE user_id IN (
  SELECT user_id 
  FROM profiles 
  WHERE username ILIKE '%panel%comics%' 
  OR display_name ILIKE '%panel%comics%'
  LIMIT 1
);

-- Find and update Kiss Komixx profile
UPDATE profiles
SET 
  seller_tier = 'premium',
  custom_fee_rate = 0.0,
  is_featured_seller = true,
  is_verified_seller = true
WHERE user_id IN (
  SELECT user_id 
  FROM profiles 
  WHERE username ILIKE '%kiss%komixx%' 
  OR display_name ILIKE '%kiss%komixx%'
  LIMIT 1
);

-- Create index for faster premium seller queries
CREATE INDEX IF NOT EXISTS idx_profiles_seller_tier ON profiles(seller_tier) WHERE seller_tier IS NOT NULL;

-- Add premium sellers to seller_featured table if not already there
INSERT INTO seller_featured (seller_id, rank, active)
SELECT user_id, 1, true
FROM profiles
WHERE username ILIKE '%panel%comics%' OR display_name ILIKE '%panel%comics%'
ON CONFLICT DO NOTHING;

INSERT INTO seller_featured (seller_id, rank, active)
SELECT user_id, 2, true
FROM profiles
WHERE username ILIKE '%kiss%komixx%' OR display_name ILIKE '%kiss%komixx%'
ON CONFLICT DO NOTHING;