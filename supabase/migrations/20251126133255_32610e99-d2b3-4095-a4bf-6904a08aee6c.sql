-- Create trade_requests table for comic-for-comic trade proposals
CREATE TABLE IF NOT EXISTS public.trade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  offer_title text NOT NULL,
  offer_issue text,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Buyers can create trade requests"
  ON public.trade_requests
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can view their own trade requests"
  ON public.trade_requests
  FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view trade requests for their listings"
  ON public.trade_requests
  FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can update status of trade requests"
  ON public.trade_requests
  FOR UPDATE
  USING (auth.uid() = seller_id);

-- Index for performance
CREATE INDEX idx_trade_requests_seller ON public.trade_requests(seller_id, created_at DESC);
CREATE INDEX idx_trade_requests_buyer ON public.trade_requests(buyer_id, created_at DESC);

-- Update the RPC function to use trade_requests instead of trades
DROP FUNCTION IF EXISTS public.update_trade_status(uuid, text);

CREATE OR REPLACE FUNCTION public.update_trade_status(
  trade_id_param uuid,
  new_status_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_record RECORD;
BEGIN
  -- Verify the caller is the seller of this trade
  SELECT tr.*, tr.seller_id
  INTO trade_record
  FROM trade_requests tr
  WHERE tr.id = trade_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trade request not found');
  END IF;
  
  IF trade_record.seller_id != auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: You are not the seller');
  END IF;
  
  -- Only allow updating pending trades
  IF trade_record.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Trade has already been ' || trade_record.status);
  END IF;
  
  -- Validate new status
  IF new_status_param NOT IN ('approved', 'declined') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;
  
  -- Update the trade
  UPDATE trade_requests
  SET status = new_status_param
  WHERE id = trade_id_param;
  
  RETURN jsonb_build_object('ok', true, 'status', new_status_param);
END;
$$;