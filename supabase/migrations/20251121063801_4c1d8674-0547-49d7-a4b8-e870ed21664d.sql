-- Add foreign key relationship for inventory_items.owner_id
ALTER TABLE inventory_items
ADD CONSTRAINT inventory_items_owner_id_fkey
FOREIGN KEY (owner_id)
REFERENCES profiles(user_id)
ON DELETE CASCADE;