-- Add new fields to profiles table for trade eligibility
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS completed_purchases_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_account_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trade_override_allow boolean DEFAULT false;

-- Create a function to check if user has open disputes in last 30 days
CREATE OR REPLACE FUNCTION public.has_no_open_disputes_last_30d(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.disputes
    WHERE user_id = user_uuid
      AND status = 'open'
      AND created_at > NOW() - INTERVAL '30 days'
  )
$$;

-- Create a view for trade eligibility data
CREATE OR REPLACE VIEW public.user_trade_eligibility AS
SELECT 
  p.user_id,
  p.completed_sales_count,
  p.completed_purchases_count,
  (p.completed_sales_count + p.completed_purchases_count) as total_completed_tx,
  p.stripe_account_verified,
  p.created_at as account_created_at,
  EXTRACT(DAY FROM (NOW() - p.created_at)) as account_age_days,
  p.trade_override_allow,
  public.has_no_open_disputes_last_30d(p.user_id) as no_open_disputes_last_30d
FROM public.profiles p;

-- Grant access to the view
GRANT SELECT ON public.user_trade_eligibility TO authenticated;