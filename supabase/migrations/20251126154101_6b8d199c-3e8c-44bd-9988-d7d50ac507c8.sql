-- Performance indexes to fix homepage carousel timeouts

-- Listings table indexes (for Featured Grails, Newly Listed, Ending Soon carousels)
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings (user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);

-- Event listings indexes (for sorting and filtering)
CREATE INDEX IF NOT EXISTS idx_event_listings_created_at ON event_listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_listings_seller_id ON event_listings (seller_id);
CREATE INDEX IF NOT EXISTS idx_event_listings_event_id ON event_listings (event_id);

-- ComicVine issues indexes (for scanner and matching performance)
CREATE INDEX IF NOT EXISTS idx_comicvine_issues_volume_id ON comicvine_issues (volume_id);
CREATE INDEX IF NOT EXISTS idx_comicvine_issues_issue_number ON comicvine_issues (issue_number);

-- Inventory items indexes (for seller dashboards, trades, and marketplace queries)
CREATE INDEX IF NOT EXISTS idx_inventory_items_user_id ON inventory_items (user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_listing_status ON inventory_items (listing_status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items (created_at DESC);