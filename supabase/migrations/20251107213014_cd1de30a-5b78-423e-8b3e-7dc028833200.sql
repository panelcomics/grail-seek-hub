-- Add trade fields to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS is_for_trade boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS in_search_of text,
ADD COLUMN IF NOT EXISTS trade_notes text;

-- Create trade_offers table
CREATE TABLE IF NOT EXISTS trade_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  message text NOT NULL,
  cash_offer numeric,
  items_offered text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_user_id, blocked_user_id)
);

-- Enable RLS
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trade_offers
CREATE POLICY "Users can create their own offers"
  ON trade_offers FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can view offers they sent"
  ON trade_offers FOR SELECT
  USING (auth.uid() = from_user_id);

CREATE POLICY "Users can view offers they received"
  ON trade_offers FOR SELECT
  USING (auth.uid() = to_user_id);

CREATE POLICY "Offer recipients can update status"
  ON trade_offers FOR UPDATE
  USING (auth.uid() = to_user_id);

-- RLS Policies for user_blocks
CREATE POLICY "Users can create their own blocks"
  ON user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_user_id);

CREATE POLICY "Users can view their own blocks"
  ON user_blocks FOR SELECT
  USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can delete their own blocks"
  ON user_blocks FOR DELETE
  USING (auth.uid() = blocker_user_id);

-- Create index for trade items query performance
CREATE INDEX IF NOT EXISTS idx_inventory_items_for_trade 
  ON inventory_items(is_for_trade) 
  WHERE is_for_trade = true;

-- Create index for blocks lookup
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker 
  ON user_blocks(blocker_user_id);

-- Trigger for trade_offers updated_at
CREATE TRIGGER update_trade_offers_updated_at
  BEFORE UPDATE ON trade_offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();