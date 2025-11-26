-- Create offers table for make offer functionality
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  offer_amount NUMERIC NOT NULL CHECK (offer_amount > 0),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Buyers can create offers
CREATE POLICY "Buyers can create offers"
  ON public.offers
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Users can view their own offers (as buyer or seller)
CREATE POLICY "Users can view their offers"
  ON public.offers
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Sellers can update offer status
CREATE POLICY "Sellers can update offer status"
  ON public.offers
  FOR UPDATE
  USING (auth.uid() = seller_id);