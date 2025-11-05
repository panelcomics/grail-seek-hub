-- Create trades table to track completed trades
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_post_id UUID REFERENCES trade_posts(id) ON DELETE CASCADE,
  user_a UUID NOT NULL,
  user_b UUID NOT NULL,
  agreed_value NUMERIC NOT NULL DEFAULT 0,
  total_fee NUMERIC,
  each_user_fee NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payment_processing', 'completed', 'payment_failed', 'cancelled')),
  user_a_payment_intent TEXT,
  user_b_payment_intent TEXT,
  user_a_paid_at TIMESTAMPTZ,
  user_b_paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trade fee settings table
CREATE TABLE IF NOT EXISTS public.trade_fee_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  percentage_fee NUMERIC NOT NULL DEFAULT 0.02,
  flat_fee NUMERIC NOT NULL DEFAULT 2.00,
  fees_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

-- Insert default trade fee settings
INSERT INTO trade_fee_settings (percentage_fee, flat_fee, fees_enabled)
VALUES (0.02, 2.00, true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_fee_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for trades
CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can update their own trades"
  ON trades FOR UPDATE
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- RLS policies for trade fee settings
CREATE POLICY "Anyone can view trade fee settings"
  ON trade_fee_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage trade fee settings"
  ON trade_fee_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger for trades
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for trade_fee_settings
CREATE TRIGGER update_trade_fee_settings_updated_at
  BEFORE UPDATE ON trade_fee_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();