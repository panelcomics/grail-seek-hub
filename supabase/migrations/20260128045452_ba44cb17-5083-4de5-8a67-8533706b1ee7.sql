-- Add bundle_group_id to orders table for tracking bundled purchases
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS bundle_group_id UUID NULL;

-- Add index for efficient bundle lookups
CREATE INDEX IF NOT EXISTS idx_orders_bundle_group_id ON public.orders(bundle_group_id) WHERE bundle_group_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.orders.bundle_group_id IS 'Groups multiple orders that were purchased together in a bundle checkout';