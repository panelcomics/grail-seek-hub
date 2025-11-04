-- Create claim_sales table for timed auctions
CREATE TABLE public.claim_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  claimed_items INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('upcoming', 'active', 'ended'))
);

-- Create claim_sale_items table for items in bins
CREATE TABLE public.claim_sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_sale_id UUID NOT NULL REFERENCES public.claim_sales(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  is_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_category CHECK (category IN ('comic', 'card'))
);

-- Create claims table for user claims
CREATE TABLE public.claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_sale_id UUID NOT NULL REFERENCES public.claim_sales(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.claim_sale_items(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  quantity INTEGER NOT NULL DEFAULT 1,
  shipping_tier TEXT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  CONSTRAINT valid_shipping_tier CHECK (shipping_tier IN ('1-15', '16-30', '31-50'))
);

-- Enable RLS
ALTER TABLE public.claim_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Claim sales policies (public read)
CREATE POLICY "Anyone can view claim sales"
ON public.claim_sales FOR SELECT
USING (true);

CREATE POLICY "Service role can manage claim sales"
ON public.claim_sales FOR ALL
USING (auth.role() = 'service_role');

-- Claim sale items policies (public read)
CREATE POLICY "Anyone can view claim sale items"
ON public.claim_sale_items FOR SELECT
USING (true);

CREATE POLICY "Service role can manage items"
ON public.claim_sale_items FOR ALL
USING (auth.role() = 'service_role');

-- Claims policies (users can only see their own)
CREATE POLICY "Users can view their own claims"
ON public.claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own claims"
ON public.claims FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for claim updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.claim_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.claim_sale_items;