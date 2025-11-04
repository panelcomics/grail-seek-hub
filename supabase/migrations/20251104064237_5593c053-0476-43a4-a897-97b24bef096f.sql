-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create influencer_codes table
CREATE TABLE public.influencer_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_rate NUMERIC DEFAULT 2.00 CHECK (discount_rate >= 0 AND discount_rate <= 100),
  is_active BOOLEAN DEFAULT true,
  monthly_cap NUMERIC DEFAULT 500.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.influencer_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies for influencer_codes
CREATE POLICY "Users can view their own codes"
ON public.influencer_codes
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage codes"
ON public.influencer_codes
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create discount_usage table
CREATE TABLE public.discount_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code_id UUID REFERENCES public.influencer_codes(id) ON DELETE CASCADE NOT NULL,
  claim_id UUID REFERENCES public.claims(id),
  month_year TEXT NOT NULL,
  savings_amount NUMERIC NOT NULL DEFAULT 0,
  item_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for discount_usage
CREATE POLICY "Users can view their own usage"
ON public.discount_usage
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create usage records"
ON public.discount_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
ON public.discount_usage
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Function to get user's current month savings
CREATE OR REPLACE FUNCTION public.get_monthly_savings(target_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(savings_amount), 0)
  FROM discount_usage
  WHERE user_id = target_user_id
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');
$$;

-- Function to calculate discounted fee
CREATE OR REPLACE FUNCTION public.calculate_discounted_fee(
  target_user_id UUID,
  item_price NUMERIC,
  shipping_method TEXT
)
RETURNS TABLE(
  fee_amount NUMERIC,
  discount_applied BOOLEAN,
  discount_rate NUMERIC,
  savings NUMERIC,
  cap_reached BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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