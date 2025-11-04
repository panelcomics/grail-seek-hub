-- Add shipping and protection fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_protection_fee NUMERIC DEFAULT 1.99;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_status TEXT DEFAULT 'held';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_hold_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payout_released_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP WITH TIME ZONE;

-- Add seller tier tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_sales_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seller_tier TEXT DEFAULT 'new';

-- Update total column to be computed including all fees
ALTER TABLE orders DROP COLUMN IF EXISTS total;
ALTER TABLE orders ADD COLUMN total NUMERIC GENERATED ALWAYS AS (
  amount + 
  COALESCE(shipping_amount, 0) + 
  COALESCE(buyer_protection_fee, 1.99) + 
  COALESCE(platform_fee_amount, 0)
) STORED;

-- Create index for faster seller tier queries
CREATE INDEX IF NOT EXISTS idx_profiles_completed_sales ON profiles(completed_sales_count);
CREATE INDEX IF NOT EXISTS idx_orders_payout_status ON orders(payout_status, payout_hold_until);