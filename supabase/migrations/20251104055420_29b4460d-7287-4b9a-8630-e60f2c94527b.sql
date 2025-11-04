-- Create custom_alerts table for user-defined price triggers
CREATE TABLE IF NOT EXISTS public.custom_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_name TEXT NOT NULL,
  item_title TEXT NOT NULL,
  category TEXT CHECK (category IN ('comic', 'card', 'any')),
  max_price NUMERIC NOT NULL,
  location_city TEXT,
  location_state TEXT,
  radius_miles INTEGER,
  is_active BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  notify_push BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_matches table for storing found deals
CREATE TABLE IF NOT EXISTS public.deal_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.custom_alerts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT,
  image_url TEXT,
  location TEXT,
  distance_miles INTEGER,
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_viewed BOOLEAN DEFAULT false,
  is_saved BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.custom_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_matches ENABLE ROW LEVEL SECURITY;

-- Custom alerts policies
CREATE POLICY "Users can view their own alerts"
ON public.custom_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts"
ON public.custom_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.custom_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.custom_alerts FOR DELETE
USING (auth.uid() = user_id);

-- Deal matches policies
CREATE POLICY "Users can view their own deal matches"
ON public.deal_matches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own deal matches"
ON public.deal_matches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage deal matches"
ON public.deal_matches FOR ALL
USING (auth.role() = 'service_role'::text);

-- Triggers
CREATE TRIGGER update_custom_alerts_updated_at
BEFORE UPDATE ON public.custom_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();