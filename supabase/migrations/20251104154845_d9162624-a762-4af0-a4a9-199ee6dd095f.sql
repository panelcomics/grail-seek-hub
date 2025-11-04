-- Create orders table for claim sale invoices
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claim_sale_id UUID NOT NULL REFERENCES claim_sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  shipping_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('paypal', 'stripe', 'other')),
  stripe_session_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own orders
CREATE POLICY "Buyers can view their own orders"
ON orders
FOR SELECT
USING (auth.uid() = buyer_id);

-- Sellers can view orders for their sales
CREATE POLICY "Sellers can view orders for their sales"
ON orders
FOR SELECT
USING (auth.uid() = seller_id);

-- Sellers can create orders for their sales
CREATE POLICY "Sellers can create orders for their sales"
ON orders
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Sellers can update orders for their sales
CREATE POLICY "Sellers can update their own orders"
ON orders
FOR UPDATE
USING (auth.uid() = seller_id);

-- Service role can manage all orders (for payment webhooks)
CREATE POLICY "Service role can manage orders"
ON orders
FOR ALL
USING (auth.role() = 'service_role');

-- Add indexes
CREATE INDEX idx_orders_buyer ON orders(buyer_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_claim_sale ON orders(claim_sale_id);
CREATE INDEX idx_orders_status ON orders(payment_status);

-- Add trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add seller_id to claim_sales table
ALTER TABLE claim_sales ADD COLUMN seller_id UUID REFERENCES auth.users(id);
ALTER TABLE claim_sales ADD COLUMN shipping_amount NUMERIC DEFAULT 0;

-- Update RLS for claim_sales to allow sellers to manage their sales
CREATE POLICY "Sellers can manage their own claim sales"
ON claim_sales
FOR ALL
USING (auth.uid() = seller_id);