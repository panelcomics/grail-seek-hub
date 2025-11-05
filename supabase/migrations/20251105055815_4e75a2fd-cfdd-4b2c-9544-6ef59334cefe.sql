-- Drop the security definer view and recreate without security definer
DROP VIEW IF EXISTS public.user_trade_eligibility;

-- Create view without security definer (users can only see their own data via RLS on profiles table)
CREATE OR REPLACE VIEW public.user_trade_eligibility AS
SELECT 
  p.user_id,
  p.completed_sales_count,
  p.completed_purchases_count,
  (p.completed_sales_count + p.completed_purchases_count) as total_completed_tx,
  p.stripe_account_verified,
  p.created_at as account_created_at,
  EXTRACT(DAY FROM (NOW() - p.created_at))::integer as account_age_days,
  p.trade_override_allow,
  public.has_no_open_disputes_last_30d(p.user_id) as no_open_disputes_last_30d
FROM public.profiles p;

-- Grant access to the view
GRANT SELECT ON public.user_trade_eligibility TO authenticated;