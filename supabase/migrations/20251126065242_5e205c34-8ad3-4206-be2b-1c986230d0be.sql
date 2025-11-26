-- Create RPC function for sellers to update offer status
CREATE OR REPLACE FUNCTION public.update_offer_status(
  offer_id_param uuid,
  new_status_param text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  offer_record RECORD;
BEGIN
  -- Verify the caller is the seller of this offer
  SELECT o.*, o.seller_id
  INTO offer_record
  FROM offers o
  WHERE o.id = offer_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Offer not found');
  END IF;
  
  IF offer_record.seller_id != auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Unauthorized: You are not the seller');
  END IF;
  
  -- Only allow updating pending offers
  IF offer_record.status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Offer has already been ' || offer_record.status);
  END IF;
  
  -- Validate new status
  IF new_status_param NOT IN ('accepted', 'declined') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;
  
  -- Update the offer
  UPDATE offers
  SET status = new_status_param
  WHERE id = offer_id_param;
  
  RETURN jsonb_build_object('ok', true, 'status', new_status_param);
END;
$$;