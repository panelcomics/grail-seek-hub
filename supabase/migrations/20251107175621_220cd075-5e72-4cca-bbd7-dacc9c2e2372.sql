-- Update calculate_discounted_fee to use new 6.5% flat rate
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

  -- Calculate base fee: Flat 6.5% Intro Rate (no minimum)
  IF shipping_method = 'ship_nationwide' THEN
    base_fee := item_price * 0.065;
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
    discounted_fee := item_price * (user_discount_rate / 100);
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
