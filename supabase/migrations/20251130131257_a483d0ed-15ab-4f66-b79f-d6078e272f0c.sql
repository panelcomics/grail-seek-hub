-- Add RLS policy to allow buyers to update their own orders to mark as paid
-- This is critical for the payment success flow where buyers need to update order status
CREATE POLICY "Buyers can update payment status on their orders"
ON public.orders
FOR UPDATE
TO public
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Add helpful comment
COMMENT ON POLICY "Buyers can update payment status on their orders" ON public.orders IS 
'Allows buyers to update their own orders (e.g., marking as paid after Stripe checkout). Required for PaymentSuccess page flow.';