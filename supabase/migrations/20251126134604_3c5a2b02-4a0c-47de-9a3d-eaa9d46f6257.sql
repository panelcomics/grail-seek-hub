-- Create trade_messages table
CREATE TABLE public.trade_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key to trade_requests
ALTER TABLE public.trade_messages
ADD CONSTRAINT trade_messages_trade_id_fkey
FOREIGN KEY (trade_id) REFERENCES public.trade_requests(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;

-- Buyers can read messages for their trades
CREATE POLICY "Buyers can read trade messages"
ON public.trade_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trade_requests
    WHERE trade_requests.id = trade_messages.trade_id
    AND trade_requests.buyer_id = auth.uid()
  )
);

-- Sellers can read messages for their trades
CREATE POLICY "Sellers can read trade messages"
ON public.trade_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trade_requests
    WHERE trade_requests.id = trade_messages.trade_id
    AND trade_requests.seller_id = auth.uid()
  )
);

-- Buyers can post messages to their trades
CREATE POLICY "Buyers can post trade messages"
ON public.trade_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.trade_requests
    WHERE trade_requests.id = trade_messages.trade_id
    AND trade_requests.buyer_id = auth.uid()
  )
);

-- Sellers can post messages to their trades
CREATE POLICY "Sellers can post trade messages"
ON public.trade_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.trade_requests
    WHERE trade_requests.id = trade_messages.trade_id
    AND trade_requests.seller_id = auth.uid()
  )
);

-- Create index for faster queries
CREATE INDEX trade_messages_trade_id_idx ON public.trade_messages(trade_id);
CREATE INDEX trade_messages_created_at_idx ON public.trade_messages(created_at);