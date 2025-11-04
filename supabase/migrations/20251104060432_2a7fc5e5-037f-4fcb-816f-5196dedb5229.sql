-- Create event_listings table for items sold at events
CREATE TABLE IF NOT EXISTS public.event_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('comic', 'card')),
  price NUMERIC NOT NULL,
  condition TEXT NOT NULL,
  grade TEXT,
  image_url TEXT,
  booth_number TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bulk_scans table for tracking bulk upload sessions
CREATE TABLE IF NOT EXISTS public.bulk_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_id UUID,
  total_items INTEGER NOT NULL,
  processed_items INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.event_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_scans ENABLE ROW LEVEL SECURITY;

-- Event listings policies
CREATE POLICY "Anyone can view event listings"
ON public.event_listings FOR SELECT
USING (is_available = true);

CREATE POLICY "Sellers can manage their own listings"
ON public.event_listings FOR ALL
USING (auth.uid() = seller_id);

-- Bulk scans policies
CREATE POLICY "Users can view their own bulk scans"
ON public.bulk_scans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create bulk scans"
ON public.bulk_scans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk scans"
ON public.bulk_scans FOR UPDATE
USING (auth.uid() = user_id);

-- Function to count event listings
CREATE OR REPLACE FUNCTION public.get_event_listing_count(target_event_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM event_listings
  WHERE event_id = target_event_id
  AND is_available = true;
$$;