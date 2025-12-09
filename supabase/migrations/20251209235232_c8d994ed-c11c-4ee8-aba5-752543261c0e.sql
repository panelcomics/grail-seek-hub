-- Create elite_deal_alerts table for Deal Finder v1
CREATE TABLE public.elite_deal_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_id UUID REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.elite_deal_alerts ENABLE ROW LEVEL SECURITY;

-- Users can view their own alerts
CREATE POLICY "Users can view their own deal alerts"
ON public.elite_deal_alerts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own alerts
CREATE POLICY "Users can create their own deal alerts"
ON public.elite_deal_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own alerts
CREATE POLICY "Users can update their own deal alerts"
ON public.elite_deal_alerts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own alerts
CREATE POLICY "Users can delete their own deal alerts"
ON public.elite_deal_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for efficient lookups
CREATE INDEX idx_elite_deal_alerts_user_id ON public.elite_deal_alerts(user_id);
CREATE INDEX idx_elite_deal_alerts_search_id ON public.elite_deal_alerts(search_id);

-- Create deal_finder_results table to store found deals
CREATE TABLE public.deal_finder_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_id UUID REFERENCES public.elite_deal_alerts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  listing_price NUMERIC NOT NULL,
  fair_market_value NUMERIC NOT NULL,
  discount_percent NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'ebay',
  source_url TEXT,
  image_url TEXT,
  is_viewed BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deal_finder_results ENABLE ROW LEVEL SECURITY;

-- Users can view their own results
CREATE POLICY "Users can view their own deal results"
ON public.deal_finder_results
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own results (mark as viewed/dismissed)
CREATE POLICY "Users can update their own deal results"
ON public.deal_finder_results
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can manage all results
CREATE POLICY "Service role can manage deal results"
ON public.deal_finder_results
FOR ALL
USING (auth.role() = 'service_role');

-- Add indexes
CREATE INDEX idx_deal_finder_results_user_id ON public.deal_finder_results(user_id);
CREATE INDEX idx_deal_finder_results_alert_id ON public.deal_finder_results(alert_id);
CREATE INDEX idx_deal_finder_results_created_at ON public.deal_finder_results(created_at DESC);