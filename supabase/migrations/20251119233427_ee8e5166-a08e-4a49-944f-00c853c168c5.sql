-- Drop existing tables and indexes if they exist (from failed migrations)
DROP TABLE IF EXISTS public.trade_offers CASCADE;
DROP TABLE IF EXISTS public.watchlist CASCADE;
DROP TABLE IF EXISTS public.waitlist_handles CASCADE;
DROP INDEX IF EXISTS public.idx_trade_offers_listing_id;
DROP INDEX IF EXISTS public.idx_trade_offers_buyer_id;
DROP INDEX IF EXISTS public.idx_trade_offers_seller_id;
DROP INDEX IF EXISTS public.idx_watchlist_user_id;
DROP INDEX IF EXISTS public.idx_watchlist_listing_id;
DROP INDEX IF EXISTS public.idx_inventory_items_for_trade;
DROP INDEX IF EXISTS public.idx_inventory_items_for_sale;
DROP INDEX IF EXISTS public.idx_inventory_items_featured;

-- Create waitlist_handles table for pre-launch signups
CREATE TABLE public.waitlist_handles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  handle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trade_offers table for trading system
CREATE TABLE public.trade_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  message TEXT,
  cash_extra NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create watchlist table for favorites
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Add trading flags to inventory_items if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'for_sale') THEN
    ALTER TABLE public.inventory_items ADD COLUMN for_sale BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'for_auction') THEN
    ALTER TABLE public.inventory_items ADD COLUMN for_auction BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'offers_enabled') THEN
    ALTER TABLE public.inventory_items ADD COLUMN offers_enabled BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'is_featured') THEN
    ALTER TABLE public.inventory_items ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.waitlist_handles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waitlist_handles (public insert)
CREATE POLICY "Anyone can insert waitlist handles" 
ON public.waitlist_handles 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view waitlist handles" 
ON public.waitlist_handles 
FOR SELECT 
USING (true);

-- RLS Policies for trade_offers
CREATE POLICY "Users can view their trade offers" 
ON public.trade_offers 
FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create trade offers" 
ON public.trade_offers 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update trade offer status" 
ON public.trade_offers 
FOR UPDATE 
USING (auth.uid() = seller_id);

-- RLS Policies for watchlist
CREATE POLICY "Users can view their own watchlist" 
ON public.watchlist 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their watchlist" 
ON public.watchlist 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their watchlist" 
ON public.watchlist 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_trade_offers_listing_id ON public.trade_offers(listing_id);
CREATE INDEX idx_trade_offers_buyer_id ON public.trade_offers(buyer_id);
CREATE INDEX idx_trade_offers_seller_id ON public.trade_offers(seller_id);
CREATE INDEX idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX idx_watchlist_listing_id ON public.watchlist(listing_id);
CREATE INDEX idx_inventory_items_for_trade ON public.inventory_items(is_for_trade) WHERE is_for_trade = true;
CREATE INDEX idx_inventory_items_for_sale ON public.inventory_items(for_sale) WHERE for_sale = true;
CREATE INDEX idx_inventory_items_featured ON public.inventory_items(is_featured) WHERE is_featured = true;