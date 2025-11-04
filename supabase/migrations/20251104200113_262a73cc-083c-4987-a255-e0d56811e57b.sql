-- Create function to increment completed sales count
CREATE OR REPLACE FUNCTION increment_completed_sales(seller_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET completed_sales_count = COALESCE(completed_sales_count, 0) + 1
  WHERE user_id = seller_user_id;
END;
$$;