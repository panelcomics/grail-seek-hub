-- Add seller fee columns to claims table
ALTER TABLE claims 
ADD COLUMN shipping_method text CHECK (shipping_method IN ('local_pickup', 'ship_nationwide')),
ADD COLUMN item_price numeric NOT NULL DEFAULT 2.00,
ADD COLUMN seller_fee numeric NOT NULL DEFAULT 0.00;

-- Update existing claims to have proper values
UPDATE claims 
SET shipping_method = 'ship_nationwide',
    item_price = 2.00,
    seller_fee = 0.10
WHERE shipping_method IS NULL;