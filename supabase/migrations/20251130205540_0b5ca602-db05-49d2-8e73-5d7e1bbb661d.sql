-- 1. Create listing_views table for view count tracking
CREATE TABLE IF NOT EXISTS public.listing_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on listing_views
ALTER TABLE public.listing_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to record listing views (anon or auth)
CREATE POLICY "Anyone can record listing views"
  ON public.listing_views
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to view aggregated listing view counts
CREATE POLICY "Anyone can view aggregated listing view counts"
  ON public.listing_views
  FOR SELECT
  USING (true);

-- Add index for performance on view count queries
CREATE INDEX idx_listing_views_listing_id ON public.listing_views(listing_id);
CREATE INDEX idx_listing_views_created_at ON public.listing_views(created_at);

-- 2. Create listing_price_changes table for price history
CREATE TABLE IF NOT EXISTS public.listing_price_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  old_price_cents integer NOT NULL,
  new_price_cents integer NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on listing_price_changes
ALTER TABLE public.listing_price_changes ENABLE ROW LEVEL SECURITY;

-- Only allow INSERT from service role or listing owner
CREATE POLICY "Listing owners can record price changes"
  ON public.listing_price_changes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_price_changes.listing_id
        AND listings.user_id = auth.uid()
    )
  );

-- Allow any logged-in user to view price history
CREATE POLICY "Anyone can view price change history"
  ON public.listing_price_changes
  FOR SELECT
  TO authenticated
  USING (true);

-- Add index for performance
CREATE INDEX idx_listing_price_changes_listing_id ON public.listing_price_changes(listing_id);
CREATE INDEX idx_listing_price_changes_changed_at ON public.listing_price_changes(changed_at DESC);

-- 3. Add seller_notes column to listings (nullable, safe additive change)
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS seller_notes text NULL;

-- 4. Create seller_policies table for shipping and return policies
CREATE TABLE IF NOT EXISTS public.seller_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE,
  shipping_policy text NULL,
  return_policy text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on seller_policies
ALTER TABLE public.seller_policies ENABLE ROW LEVEL SECURITY;

-- Only seller can INSERT/UPDATE their own policies
CREATE POLICY "Sellers can manage their own policies"
  ON public.seller_policies
  FOR ALL
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Anyone can view seller policies (public data)
CREATE POLICY "Anyone can view seller policies"
  ON public.seller_policies
  FOR SELECT
  USING (true);

-- Add index for performance
CREATE INDEX idx_seller_policies_seller_id ON public.seller_policies(seller_id);

-- Add trigger to update updated_at on seller_policies
CREATE OR REPLACE FUNCTION public.update_seller_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seller_policies_updated_at_trigger
  BEFORE UPDATE ON public.seller_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seller_policies_updated_at();