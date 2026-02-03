-- =============================================================================
-- BASELANE PACK V1 - GRANULAR FEATURE FLAGS + NOTIFICATIONS ENHANCEMENT
-- =============================================================================

-- 1. Create baselane_feature_flags table for database-driven toggles
CREATE TABLE public.baselane_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.baselane_feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read flags (needed for UI gating)
CREATE POLICY "Anyone can read feature flags"
  ON public.baselane_feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update flags
CREATE POLICY "Admins can update feature flags"
  ON public.baselane_feature_flags
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default flags (all OFF)
INSERT INTO public.baselane_feature_flags (flag_key, enabled, description) VALUES
  ('ENABLE_BASELANE_PACK_V1', false, 'Master toggle for all Baselane features'),
  ('ENABLE_ORDER_TIMELINE', false, 'Order status timeline on order detail pages'),
  ('ENABLE_SELLER_WALLET', false, 'Seller wallet with pending/available/on-hold balances'),
  ('ENABLE_EARNINGS_DASHBOARD', false, 'Earnings & fees dashboard with CSV export'),
  ('ENABLE_RISK_HOLDS', false, 'Non-blocking risk assessment and payout holds'),
  ('ENABLE_NOTIFICATIONS', false, 'Notifications center with bell icon');

-- 2. Extend notifications table with title and metadata
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_baselane_feature_flags_key ON public.baselane_feature_flags(flag_key);

-- 4. Add updated_at trigger for flags table
CREATE TRIGGER update_baselane_feature_flags_updated_at
  BEFORE UPDATE ON public.baselane_feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();