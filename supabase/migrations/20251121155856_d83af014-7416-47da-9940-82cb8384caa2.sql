-- Allow public viewing of listed items for sale
CREATE POLICY "Public can view listed items"
ON public.inventory_items
FOR SELECT
USING (
  listing_status IN ('listed', 'active') 
  AND (for_sale = true OR for_auction = true OR is_for_trade = true)
);