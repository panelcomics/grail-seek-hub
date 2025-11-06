-- Recreate views as SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.seller_stats;
DROP VIEW IF EXISTS public.top_scanned_titles;

-- Create view for seller stats (SECURITY INVOKER by default)
CREATE VIEW public.seller_stats AS
SELECT 
  i.user_id,
  COUNT(*) as total_scans,
  COUNT(*) FILTER (WHERE i.listing_status = 'listed') as active_listings,
  COUNT(*) FILTER (WHERE i.listing_status = 'sold') as items_sold,
  COALESCE(SUM(i.listed_price) FILTER (WHERE i.listing_status = 'listed'), 0) as total_listed_value,
  COALESCE(SUM(i.listed_price) FILTER (WHERE i.listing_status = 'sold'), 0) as gross_sales
FROM public.inventory_items i
GROUP BY i.user_id;

-- Create view for top scanned titles (SECURITY INVOKER by default)
CREATE VIEW public.top_scanned_titles AS
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