-- Add founding seller fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_founding_seller BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_fee_rate NUMERIC DEFAULT NULL;

-- Create index for faster founding seller queries
CREATE INDEX IF NOT EXISTS idx_profiles_founding_seller 
ON profiles(is_founding_seller) 
WHERE is_founding_seller = true;

-- Function to assign founding seller status on profile creation
CREATE OR REPLACE FUNCTION assign_founding_seller_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_founding_seller_count INTEGER;
BEGIN
  -- Count existing founding sellers
  SELECT COUNT(*)
  INTO current_founding_seller_count
  FROM profiles
  WHERE is_founding_seller = true;
  
  -- If less than 100 founding sellers, grant founding seller status
  IF current_founding_seller_count < 100 THEN
    NEW.is_founding_seller := true;
    NEW.custom_fee_rate := 0.02; -- 2% GrailSeeker fee
  ELSE
    NEW.is_founding_seller := false;
    NEW.custom_fee_rate := 0.0375; -- 3.75% standard fee
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profile insert
DROP TRIGGER IF EXISTS on_profile_created_founding_status ON profiles;
CREATE TRIGGER on_profile_created_founding_status
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_founding_seller_status();

-- Function to get founding seller count (for banner display)
CREATE OR REPLACE FUNCTION get_founding_seller_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM profiles
  WHERE is_founding_seller = true;
$$;