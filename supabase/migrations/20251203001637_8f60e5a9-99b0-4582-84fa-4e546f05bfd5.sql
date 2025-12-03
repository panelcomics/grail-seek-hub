-- Saved searches: filter by user_id
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id 
ON public.saved_searches USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at 
ON public.saved_searches USING btree (created_at DESC);

-- Inventory trade offers: filter by users and status
CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_initiator 
ON public.inventory_trade_offers USING btree (initiator_user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_target 
ON public.inventory_trade_offers USING btree (target_user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_status 
ON public.inventory_trade_offers USING btree (status);

CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_created_at 
ON public.inventory_trade_offers USING btree (created_at DESC);

-- Trade offer items: JOIN on trade_offer_id
CREATE INDEX IF NOT EXISTS idx_trade_offer_items_trade_offer_id 
ON public.trade_offer_items USING btree (trade_offer_id);

CREATE INDEX IF NOT EXISTS idx_trade_offer_items_item_id 
ON public.trade_offer_items USING btree (item_id);

-- User ratings: filter by reviewed user
CREATE INDEX IF NOT EXISTS idx_user_ratings_reviewed_user_id 
ON public.user_ratings USING btree (reviewed_user_id);

CREATE INDEX IF NOT EXISTS idx_user_ratings_reviewer_id 
ON public.user_ratings USING btree (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_user_ratings_created_at 
ON public.user_ratings USING btree (created_at DESC);

-- Watchlist items: already has composite unique on user_id+listing_id
-- Add separate listing_id index for reverse lookups (count watchers)
CREATE INDEX IF NOT EXISTS idx_watchlist_items_listing_id 
ON public.watchlist_items USING btree (listing_id);