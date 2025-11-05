-- Create function to increment completed purchases count
CREATE OR REPLACE FUNCTION public.increment_completed_purchases(buyer_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET completed_purchases_count = COALESCE(completed_purchases_count, 0) + 1
  WHERE user_id = buyer_user_id;
END;
$$;