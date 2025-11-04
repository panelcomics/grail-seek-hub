-- Add Stripe Connect and shipping fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_rate NUMERIC DEFAULT 0.03;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS charge_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transfer_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT 'none';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE;

-- Add stripe_account_id to profiles table for Stripe Connect
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;