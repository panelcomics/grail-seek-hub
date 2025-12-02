-- Trade offer items for multi-item trade support
CREATE TABLE IF NOT EXISTS public.trade_offer_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_offer_id UUID NOT NULL REFERENCES public.inventory_trade_offers(id) ON DELETE CASCADE,
  item_id UUID NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('offered', 'requested')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Saved searches for users
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT,
  query JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_offer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS for trade_offer_items
CREATE POLICY "Users can view trade offer items for their trades"
  ON public.trade_offer_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_trade_offers t
      WHERE t.id = trade_offer_items.trade_offer_id
      AND (t.initiator_user_id = auth.uid() OR t.target_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create trade offer items for their trades"
  ON public.trade_offer_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_trade_offers t
      WHERE t.id = trade_offer_items.trade_offer_id
      AND t.initiator_user_id = auth.uid()
    )
  );

-- RLS for saved_searches
CREATE POLICY "Users can view their own saved searches"
  ON public.saved_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
  ON public.saved_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON public.saved_searches FOR DELETE
  USING (auth.uid() = user_id);