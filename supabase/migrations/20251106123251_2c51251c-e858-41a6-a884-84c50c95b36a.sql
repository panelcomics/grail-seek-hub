-- Create inventory_items table for seller's private inventory
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  comicvine_issue_id TEXT,
  title TEXT,
  issue_number TEXT,
  grade TEXT,
  private_location TEXT,
  private_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Owners can read/write their inventory (completely private)
CREATE POLICY "Owners can manage their inventory"
ON public.inventory_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add optional inventory_item_id to existing listings table
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;

-- Trigger for inventory_items updated_at
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_inventory_item_id ON public.listings(inventory_item_id);