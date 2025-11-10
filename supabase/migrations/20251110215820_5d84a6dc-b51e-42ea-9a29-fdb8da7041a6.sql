-- 1. Add seller verification + custom fee support to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_verified_seller boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_fee_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- 2. Create favorite_sellers table
CREATE TABLE IF NOT EXISTS public.favorite_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, seller_id)
);

ALTER TABLE public.favorite_sellers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own favorite sellers"
    ON public.favorite_sellers
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can view favorite sellers for counts"
    ON public.favorite_sellers
    FOR SELECT
    TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_favorite_sellers_user_id ON public.favorite_sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_sellers_seller_id ON public.favorite_sellers(seller_id);

-- 3. Create auction_watches table
CREATE TABLE IF NOT EXISTS public.auction_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  notified_1hour boolean DEFAULT false,
  notified_10min boolean DEFAULT false,
  UNIQUE(user_id, listing_id)
);

ALTER TABLE public.auction_watches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can manage their own auction watches"
    ON public.auction_watches
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_auction_watches_user_id ON public.auction_watches(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_watches_listing_id ON public.auction_watches(listing_id);

-- 4. Add claim_cutoff_at to claim_sales
ALTER TABLE public.claim_sales 
  ADD COLUMN IF NOT EXISTS claim_cutoff_at timestamptz;

-- 5. Add is_winning_bid to bids
ALTER TABLE public.bids 
  ADD COLUMN IF NOT EXISTS is_winning_bid boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_bids_listing_winning ON public.bids(listing_id, is_winning_bid);

-- 6. Create notification_queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  data jsonb,
  sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Service role can manage all notification queue"
    ON public.notification_queue
    FOR ALL
    TO service_role
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their own notifications"
    ON public.notification_queue
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_queue_unsent ON public.notification_queue(user_id) WHERE sent = false;

-- 7. Create get_seller_follower_count function
CREATE OR REPLACE FUNCTION public.get_seller_follower_count(seller_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.favorite_sellers
  WHERE seller_id = seller_user_id;
$$;