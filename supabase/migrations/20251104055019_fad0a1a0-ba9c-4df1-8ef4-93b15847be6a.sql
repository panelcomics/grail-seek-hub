-- Create collections table for user-owned items
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('comic', 'card')),
  grade TEXT,
  condition TEXT NOT NULL,
  purchase_price NUMERIC NOT NULL,
  purchase_date DATE NOT NULL,
  current_value NUMERIC NOT NULL,
  image_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_history table for tracking value changes
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  source TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_alerts table for notifying users of significant changes
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('increase', 'decrease', 'threshold')),
  percentage_change NUMERIC,
  threshold_value NUMERIC,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Collections policies
CREATE POLICY "Users can view their own collections"
ON public.collections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
ON public.collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
ON public.collections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
ON public.collections FOR DELETE
USING (auth.uid() = user_id);

-- Price history policies
CREATE POLICY "Users can view price history for their collections"
ON public.price_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collections
    WHERE collections.id = price_history.collection_id
    AND collections.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage price history"
ON public.price_history FOR ALL
USING (auth.role() = 'service_role'::text);

-- Price alerts policies
CREATE POLICY "Users can view their own alerts"
ON public.price_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.price_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage alerts"
ON public.price_alerts FOR ALL
USING (auth.role() = 'service_role'::text);

-- Triggers
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();