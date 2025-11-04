-- Add era and type columns to trade_posts table
ALTER TABLE trade_posts 
ADD COLUMN era text CHECK (era IN ('Golden', 'Silver', 'Bronze', 'Copper', 'Modern')),
ADD COLUMN type text CHECK (type IN ('Variants', 'Keys', 'Slabs'));