-- Create a new isolated table for item-to-item trade offers
-- Named differently to avoid conflict with existing trade_offers table
CREATE TABLE public.inventory_trade_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offered_item_id UUID NOT NULL,
  requested_item_id UUID NOT NULL,
  initiator_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_trade_offers ENABLE ROW LEVEL SECURITY;

-- Users can view trades they're involved in
CREATE POLICY "Users can view their trade offers"
ON public.inventory_trade_offers
FOR SELECT
USING (auth.uid() = initiator_user_id OR auth.uid() = target_user_id);

-- Users can create trade offers
CREATE POLICY "Users can create trade offers"
ON public.inventory_trade_offers
FOR INSERT
WITH CHECK (auth.uid() = initiator_user_id);

-- Initiators can cancel their offers, targets can accept/reject
CREATE POLICY "Users can update their trade offers"
ON public.inventory_trade_offers
FOR UPDATE
USING (auth.uid() = initiator_user_id OR auth.uid() = target_user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_trade_offers_updated_at
BEFORE UPDATE ON public.inventory_trade_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();