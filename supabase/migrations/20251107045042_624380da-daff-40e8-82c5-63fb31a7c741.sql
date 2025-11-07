-- Convert read-only functions that only access public data to SECURITY INVOKER
-- This improves security by ensuring functions execute with caller's privileges

-- Function to get user rating - only reads public data
CREATE OR REPLACE FUNCTION public.get_user_rating(target_user_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_ratings BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ROUND(AVG(rating)::numeric, 1) as average_rating,
    COUNT(*) as total_ratings
  FROM user_ratings
  WHERE reviewed_user_id = target_user_id;
$$;

-- Function to count event listings - only reads public data
CREATE OR REPLACE FUNCTION public.get_event_listing_count(target_event_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM event_listings
  WHERE event_id = target_event_id
  AND is_available = true;
$$;

-- Function to calculate seller favorites - only reads public data
CREATE OR REPLACE FUNCTION public.calculate_seller_favorites(seller_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER  -- Changed from SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT f.id)::integer
  FROM favorites f
  INNER JOIN claim_sale_items csi ON f.listing_id = csi.id
  INNER JOIN claim_sales cs ON csi.claim_sale_id = cs.id
  WHERE cs.seller_id = seller_user_id;
$$;

-- Add access control to get_monthly_savings to ensure users only access their own data
CREATE OR REPLACE FUNCTION public.get_monthly_savings(target_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER  -- Kept as DEFINER but added access check
SET search_path = public
AS $$
  -- Only allow users to check their own savings or admins to check any
  SELECT COALESCE(SUM(savings_amount), 0)
  FROM discount_usage
  WHERE user_id = target_user_id
    AND (target_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
$$;

-- Add access control to calculate_discounted_fee
CREATE OR REPLACE FUNCTION public.calculate_discounted_fee(
  target_user_id uuid,
  item_price numeric,
  shipping_method text
)
RETURNS TABLE(
  fee_amount numeric,
  discount_applied boolean,
  discount_rate numeric,
  savings numeric,
  cap_reached boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER  -- Kept as DEFINER but added access check
SET search_path = public
AS $$
DECLARE
  base_fee NUMERIC;
  discounted_fee NUMERIC;
  user_discount_rate NUMERIC;
  current_month_savings NUMERIC;
  monthly_cap NUMERIC;
  potential_savings NUMERIC;
BEGIN
  -- Only allow users to check their own fees or admins to check any
  IF target_user_id != auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: can only calculate fees for your own account';
  END IF;

  -- Calculate base fee
  IF shipping_method = 'ship_nationwide' THEN
    base_fee := GREATEST(item_price * 0.05, 5.00);
  ELSE
    base_fee := 0;
  END IF;

  -- Check if user has active discount code
  SELECT ic.discount_rate, ic.monthly_cap
  INTO user_discount_rate, monthly_cap
  FROM influencer_codes ic
  WHERE ic.user_id = target_user_id
    AND ic.is_active = true
  LIMIT 1;

  -- If no discount, return base fee
  IF user_discount_rate IS NULL THEN
    RETURN QUERY SELECT base_fee, false, 0::NUMERIC, 0::NUMERIC, false;
    RETURN;
  END IF;

  -- Calculate discounted fee
  IF shipping_method = 'ship_nationwide' THEN
    discounted_fee := GREATEST(item_price * (user_discount_rate / 100), 5.00);
  ELSE
    discounted_fee := 0;
  END IF;

  potential_savings := base_fee - discounted_fee;

  -- Check monthly cap
  current_month_savings := public.get_monthly_savings(target_user_id);

  IF current_month_savings + potential_savings > monthly_cap THEN
    -- Cap reached, return base fee
    RETURN QUERY SELECT base_fee, false, user_discount_rate, 0::NUMERIC, true;
  ELSE
    -- Apply discount
    RETURN QUERY SELECT discounted_fee, true, user_discount_rate, potential_savings, false;
  END IF;
END;
$$;

-- Keep the following functions as SECURITY DEFINER (they require elevated privileges):
-- 1. has_role - Required for RLS to avoid recursion (explicitly approved in security guidelines)
-- 2. handle_new_user - Trigger that creates profiles on signup
-- 3. increment_completed_sales - Updates seller stats across users
-- 4. increment_completed_purchases - Updates buyer stats across users  
-- 5. update_seller_favorites_total - Batch updates for all sellers
-- 6. notify_claim_sale_price_drop - Trigger that sends notifications

-- Add comments to document why these remain SECURITY DEFINER
COMMENT ON FUNCTION public.has_role IS 'SECURITY DEFINER required to prevent recursive RLS checks when validating user roles';
COMMENT ON FUNCTION public.handle_new_user IS 'SECURITY DEFINER required for trigger to create profile on user signup';
COMMENT ON FUNCTION public.increment_completed_sales IS 'SECURITY DEFINER required to update seller statistics';
COMMENT ON FUNCTION public.increment_completed_purchases IS 'SECURITY DEFINER required to update buyer statistics';
COMMENT ON FUNCTION public.update_seller_favorites_total IS 'SECURITY DEFINER required for batch updates across all sellers';
COMMENT ON FUNCTION public.notify_claim_sale_price_drop IS 'SECURITY DEFINER required for trigger to send notifications';