-- Add marketplace support to existing orders table
DO $$
BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS listing_id uuid REFERENCES listings(id);
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_cents integer;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name text;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address jsonb;
END $$;

-- Make claim_id nullable for marketplace orders
ALTER TABLE orders ALTER COLUMN claim_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN claim_sale_id DROP NOT NULL;

-- Backfill status from payment_status for existing orders
UPDATE orders 
SET status = CASE 
  WHEN payment_status = 'pending' THEN 'requires_payment'
  WHEN payment_status = 'completed' THEN 'paid'
  WHEN payment_status = 'failed' THEN 'cancelled'
  ELSE 'requires_payment'
END
WHERE status IS NULL;

-- Backfill amount_cents from amount
UPDATE orders
SET amount_cents = (amount * 100)::integer
WHERE amount_cents IS NULL AND amount IS NOT NULL;

-- Add marketplace fields to existing listings table
DO $$
BEGIN
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_cents integer;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS fee_cents integer DEFAULT 0;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS payout_cents integer DEFAULT 0;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;
END $$;

-- Update existing listings to have price_cents from price
UPDATE listings 
SET price_cents = (price * 100)::integer
WHERE price_cents IS NULL AND price IS NOT NULL;

-- Add missing fields to inventory_items
DO $$ 
BEGIN
  ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS series text;
  ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS publisher text;
  ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cgc_grade text;
  ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS condition text;
  ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS cover_date date;
  ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS images jsonb;
  ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS owner_id uuid;
END $$;

-- Backfill owner_id from user_id
UPDATE inventory_items SET owner_id = user_id WHERE owner_id IS NULL;

-- Update profiles table
DO $$
BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;
END $$;

-- Create event_logs table
CREATE TABLE IF NOT EXISTS event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text NOT NULL,
  meta jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage event logs" ON event_logs;

CREATE POLICY "Service role can manage event logs"
  ON event_logs FOR ALL
  USING (auth.role() = 'service_role');

-- Create inventory_items_public view
CREATE OR REPLACE VIEW inventory_items_public AS
SELECT 
  id,
  owner_id,
  title,
  issue_number,
  series,
  publisher,
  grade,
  cgc_grade,
  condition,
  cover_date,
  images,
  comicvine_issue_id,
  created_at,
  updated_at
FROM inventory_items;