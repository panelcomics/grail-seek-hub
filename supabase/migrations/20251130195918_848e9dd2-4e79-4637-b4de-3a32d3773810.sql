-- Create watchlist_items table for user favorites
CREATE TABLE public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_listing UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own watchlist items
CREATE POLICY "Users can insert their own watchlist items"
  ON public.watchlist_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own watchlist items"
  ON public.watchlist_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlist items"
  ON public.watchlist_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);