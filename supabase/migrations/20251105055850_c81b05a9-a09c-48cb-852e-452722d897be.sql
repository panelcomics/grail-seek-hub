-- Drop the view entirely and handle calculations client-side or via non-definer function
DROP VIEW IF EXISTS public.user_trade_eligibility;

-- Instead, create a non-security-definer function that returns trade eligibility data
-- This function will respect RLS since it's not SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_trade_eligibility(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  user_id uuid,
  completed_sales_count integer,
  completed_purchases_count integer,
  total_completed_tx integer,
  stripe_account_verified boolean,
  account_created_at timestamptz,
  account_age_days integer,
  trade_override_allow boolean,
  no_open_disputes_last_30d boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.completed_sales_count,
    p.completed_purchases_count,
    (p.completed_sales_count + p.completed_purchases_count)::integer as total_completed_tx,
    p.stripe_account_verified,
    p.created_at as account_created_at,
    EXTRACT(DAY FROM (NOW() - p.created_at))::integer as account_age_days,
    p.trade_override_allow,
    NOT EXISTS (
      SELECT 1
      FROM public.disputes
      WHERE user_id = target_user_id
        AND status = 'open'
        AND created_at > NOW() - INTERVAL '30 days'
    ) as no_open_disputes_last_30d
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- Drop the security definer function as it's no longer needed
DROP FUNCTION IF EXISTS public.has_no_open_disputes_last_30d(uuid);