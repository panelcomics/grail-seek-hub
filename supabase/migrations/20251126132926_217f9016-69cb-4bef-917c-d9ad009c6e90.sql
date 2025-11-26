-- Create RPC function for sellers to update trade request status
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
  SELECT t.*, t.seller_id
  INTO trade_record
  FROM trades t
  WHERE t.id = trade_id_param;
  
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
  UPDATE trades
  SET status = new_status_param
  WHERE id = trade_id_param;
  
  RETURN jsonb_build_object('ok', true, 'status', new_status_param);
END;
$$;