-- Add shipping_price column to inventory_items table
ALTER TABLE inventory_items 
ADD COLUMN shipping_price numeric;