-- =====================================================
-- PHASE 1: SUBSCRIPTION SYSTEM - ADDITIVE ONLY
-- This migration adds subscription support WITHOUT
-- modifying any existing fee or trade logic
-- =====================================================

-- 1.1 Add subscription columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.subscription_tier IS 'Subscription tier: null (free) or elite (paid)';
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'When the current subscription period ends';

-- 1.2 Create user_subscriptions table for tracking subscription history
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'elite',
  status TEXT NOT NULL DEFAULT 'incomplete',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_tier CHECK (tier IN ('elite')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'))
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage all subscriptions"
ON public.user_subscriptions
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription_id ON public.user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_subscriptions_updated_at();