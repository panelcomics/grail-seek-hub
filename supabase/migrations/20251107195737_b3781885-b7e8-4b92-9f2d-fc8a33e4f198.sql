-- Add Shippo shipping label columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS label_cost_cents integer,
ADD COLUMN IF NOT EXISTS shipping_charged_cents integer,
ADD COLUMN IF NOT EXISTS shipping_margin_cents integer,
ADD COLUMN IF NOT EXISTS label_url text,
ADD COLUMN IF NOT EXISTS shippo_transaction_id text,
ADD COLUMN IF NOT EXISTS shippo_rate_id text;