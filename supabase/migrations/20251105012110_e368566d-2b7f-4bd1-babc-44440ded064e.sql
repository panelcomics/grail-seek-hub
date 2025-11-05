-- Create seller_settings table
CREATE TABLE public.seller_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  accept_offers boolean NOT NULL DEFAULT false,
  min_offer_percentage numeric NOT NULL DEFAULT 10.00,
  auto_decline_below_min boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view seller settings
CREATE POLICY "Anyone can view seller settings"
  ON public.seller_settings
  FOR SELECT
  USING (true);

-- Sellers can manage their own settings
CREATE POLICY "Sellers can manage their own settings"
  ON public.seller_settings
  FOR ALL
  USING (auth.uid() = seller_id);

-- Add trigger for updated_at
CREATE TRIGGER update_seller_settings_updated_at
  BEFORE UPDATE ON public.seller_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_seller_settings_seller_id ON public.seller_settings(seller_id);