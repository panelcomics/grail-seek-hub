-- Add shipping_amount column if it doesn't exist (safe to run if already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'shipping_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN shipping_amount NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Recreate total as a generated column
ALTER TABLE orders DROP COLUMN IF EXISTS total;
ALTER TABLE orders ADD COLUMN total NUMERIC GENERATED ALWAYS AS (amount + shipping_amount) STORED;