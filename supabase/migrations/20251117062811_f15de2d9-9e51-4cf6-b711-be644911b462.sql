-- Create listing_images table for multiple images per listing
CREATE TABLE IF NOT EXISTS public.listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  url text NOT NULL,
  thumbnail_url text,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listing_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view images for their own listings
CREATE POLICY "Users can view their own listing images"
ON public.listing_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = listing_images.listing_id
    AND inventory_items.user_id = auth.uid()
  )
);

-- Policy: Users can add images to their listings (max 8 check in app)
CREATE POLICY "Users can add images to their listings"
ON public.listing_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = listing_images.listing_id
    AND inventory_items.user_id = auth.uid()
  )
);

-- Policy: Users can update their listing images
CREATE POLICY "Users can update their listing images"
ON public.listing_images FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = listing_images.listing_id
    AND inventory_items.user_id = auth.uid()
  )
);

-- Policy: Users can delete their listing images
CREATE POLICY "Users can delete their listing images"
ON public.listing_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = listing_images.listing_id
    AND inventory_items.user_id = auth.uid()
  )
);

-- Index for faster lookups
CREATE INDEX idx_listing_images_listing_id ON public.listing_images(listing_id);
CREATE INDEX idx_listing_images_sort_order ON public.listing_images(listing_id, sort_order);

-- Partial unique index to ensure only one primary image per listing
CREATE UNIQUE INDEX idx_unique_primary_per_listing 
ON public.listing_images(listing_id) 
WHERE is_primary = true;

-- Function to ensure only one primary image per listing
CREATE OR REPLACE FUNCTION public.ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a new primary, unset any existing primary
  IF NEW.is_primary = true THEN
    UPDATE public.listing_images
    SET is_primary = false
    WHERE listing_id = NEW.listing_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single primary image
CREATE TRIGGER trigger_ensure_single_primary
BEFORE INSERT OR UPDATE ON public.listing_images
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.ensure_single_primary_image();