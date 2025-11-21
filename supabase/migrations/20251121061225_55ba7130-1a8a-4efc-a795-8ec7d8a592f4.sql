-- Add trust and safety fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_verified_seller BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completed_sales_count INTEGER DEFAULT 0;

-- Create function to increment completed sales
CREATE OR REPLACE FUNCTION public.increment_completed_sales(seller_user_id UUID)
RETURNS VOID
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