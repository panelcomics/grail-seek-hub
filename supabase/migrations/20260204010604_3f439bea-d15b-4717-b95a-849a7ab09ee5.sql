-- Create seller_tax_profiles table for Tax & 1099 data collection
CREATE TABLE public.seller_tax_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  legal_name TEXT,
  business_name TEXT,
  tax_classification TEXT CHECK (tax_classification IN ('individual', 'business')),
  tax_id_encrypted TEXT, -- SSN or EIN (stored securely, masked in UI)
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_tax_profiles ENABLE ROW LEVEL SECURITY;

-- Sellers can only view/edit their own tax profile
CREATE POLICY "Users can view their own tax profile"
  ON public.seller_tax_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tax profile"
  ON public.seller_tax_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax profile"
  ON public.seller_tax_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all tax profiles for 1099 reporting
CREATE POLICY "Admins can view all tax profiles"
  ON public.seller_tax_profiles
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_seller_tax_profiles_updated_at
  BEFORE UPDATE ON public.seller_tax_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert feature flag for Tax & 1099 (default false)
INSERT INTO public.app_settings (key, value, description)
VALUES ('enable_tax_1099', 'false', 'Tax & 1099 Information section for sellers')
ON CONFLICT (key) DO NOTHING;

-- Insert configurable 1099-K thresholds
INSERT INTO public.app_settings (key, value, description)
VALUES 
  ('tax_1099k_gross_threshold', '5000', 'Gross sales threshold (in dollars) for 1099-K reporting'),
  ('tax_1099k_tx_threshold', '0', 'Transaction count threshold for 1099-K reporting (0 = no minimum)')
ON CONFLICT (key) DO NOTHING;