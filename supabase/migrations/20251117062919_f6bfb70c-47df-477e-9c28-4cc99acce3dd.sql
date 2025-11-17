-- Fix search_path for ensure_single_primary_image function
CREATE OR REPLACE FUNCTION public.ensure_single_primary_image()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If setting a new primary, unset any existing primary
  IF NEW.is_primary = true THEN
    UPDATE public.listing_images
    SET is_primary = false
    WHERE listing_id = NEW.listing_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;