-- Allow buyers and sellers to view their own marketplace orders
CREATE POLICY "Orders selectable by buyer or seller"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
