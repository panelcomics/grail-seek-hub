-- Function to get the current count of founding sellers
CREATE OR REPLACE FUNCTION public.get_founding_seller_count()
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM profiles
  WHERE is_founding_seller = true;
$$;

-- Function to assign founding seller status automatically
-- This runs before insert on profiles table
CREATE OR REPLACE FUNCTION public.assign_founding_seller_status()
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

-- Create trigger to automatically assign founding seller status on profile creation
DROP TRIGGER IF EXISTS set_founding_seller_status ON profiles;
CREATE TRIGGER set_founding_seller_status
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_founding_seller_status();