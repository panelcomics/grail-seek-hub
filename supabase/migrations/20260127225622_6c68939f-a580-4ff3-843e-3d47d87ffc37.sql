-- Create cart_items table for logged-in users
-- Follows additive-only pattern - new isolated table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Future-proofing: allow seller bundling later
  bundle_group_id UUID NULL,
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cart items
CREATE POLICY "Users can view their own cart items"
ON public.cart_items
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add items to their own cart
CREATE POLICY "Users can add to their own cart"
ON public.cart_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove items from their own cart
CREATE POLICY "Users can remove from their own cart"
ON public.cart_items
FOR DELETE
USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_listing_id ON public.cart_items(listing_id);
CREATE INDEX idx_cart_items_seller_id ON public.cart_items(seller_id);