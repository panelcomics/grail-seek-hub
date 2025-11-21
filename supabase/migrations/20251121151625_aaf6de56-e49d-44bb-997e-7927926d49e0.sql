-- Add slab and local pickup flags to inventory_items for search filtering
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS is_slab boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_pickup boolean DEFAULT false;