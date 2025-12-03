-- Performance indexes for high-traffic tables
-- These are additive only - no schema modifications

-- Listings table indexes (search, browse, homepage)
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price ON public.listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.listings(type);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON public.listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status_type ON public.listings(status, type);

-- Inventory items indexes (collection, inventory management)
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON public.inventory_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_listing_status ON public.inventory_items(listing_status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_for_sale ON public.inventory_items(for_sale) WHERE for_sale = true;
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_for_trade ON public.inventory_items(is_for_trade) WHERE is_for_trade = true;

-- Inventory trade offers indexes
CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_initiator ON public.inventory_trade_offers(initiator_user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_target ON public.inventory_trade_offers(target_user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_status ON public.inventory_trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_inventory_trade_offers_created_at ON public.inventory_trade_offers(created_at DESC);

-- Trade offer items indexes
CREATE INDEX IF NOT EXISTS idx_trade_offer_items_trade_offer_id ON public.trade_offer_items(trade_offer_id);
CREATE INDEX IF NOT EXISTS idx_trade_offer_items_item_id ON public.trade_offer_items(item_id);

-- Saved searches indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON public.saved_searches(created_at DESC);

-- Watchlist items indexes
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_listing_id ON public.watchlist_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_listing ON public.watchlist_items(user_id, listing_id);

-- User ratings indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_reviewed_user_id ON public.user_ratings(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_reviewer_id ON public.user_ratings(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created_at ON public.user_ratings(created_at DESC);

-- Favorites indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_listing_id ON public.favorites(listing_id);

-- Offers indexes
CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON public.offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status);

-- Bids indexes (auctions)
CREATE INDEX IF NOT EXISTS idx_bids_listing_id ON public.bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_bids_user_id ON public.bids(user_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids(created_at DESC);