-- Create storage_containers table
CREATE TABLE public.storage_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add storage_container_id to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN storage_container_id UUID REFERENCES public.storage_containers(id) ON DELETE SET NULL;

-- Add listing status columns to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN listing_status TEXT DEFAULT 'not_listed' CHECK (listing_status IN ('not_listed', 'listed', 'sold')),
ADD COLUMN listed_price NUMERIC,
ADD COLUMN sold_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on storage_containers
ALTER TABLE public.storage_containers ENABLE ROW LEVEL SECURITY;

-- RLS policies for storage_containers
CREATE POLICY "Users can manage their own storage containers"
ON public.storage_containers
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for storage_containers updated_at
CREATE TRIGGER update_storage_containers_updated_at
BEFORE UPDATE ON public.storage_containers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create view for seller stats
CREATE OR REPLACE VIEW public.seller_stats AS
SELECT 
  i.user_id,
  COUNT(*) as total_scans,
  COUNT(*) FILTER (WHERE i.listing_status = 'listed') as active_listings,
  COUNT(*) FILTER (WHERE i.listing_status = 'sold') as items_sold,
  COALESCE(SUM(i.listed_price) FILTER (WHERE i.listing_status = 'listed'), 0) as total_listed_value,
  COALESCE(SUM(i.listed_price) FILTER (WHERE i.listing_status = 'sold'), 0) as gross_sales
FROM public.inventory_items i
GROUP BY i.user_id;

-- Create view for top scanned titles
CREATE OR REPLACE VIEW public.top_scanned_titles AS
SELECT 
  i.user_id,
  i.title,
  i.series,
  COUNT(*) as scan_count,
  COUNT(*) FILTER (WHERE i.listing_status = 'listed') as listed_count,
  COUNT(*) FILTER (WHERE i.listing_status = 'sold') as sold_count
FROM public.inventory_items i
WHERE i.title IS NOT NULL
GROUP BY i.user_id, i.title, i.series
ORDER BY scan_count DESC;

-- Grant access to views
GRANT SELECT ON public.seller_stats TO authenticated;
GRANT SELECT ON public.top_scanned_titles TO authenticated;