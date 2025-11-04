-- Add location fields to claim_sale_items
ALTER TABLE claim_sale_items 
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN latitude numeric,
ADD COLUMN longitude numeric,
ADD COLUMN distance_miles integer;

-- Create events table for conventions and card shows
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  event_type text NOT NULL, -- 'convention', 'card_show', 'local_event'
  city text NOT NULL,
  state text NOT NULL,
  venue text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  image_url text,
  website_url text,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view events
CREATE POLICY "Anyone can view events" 
ON events FOR SELECT 
USING (true);

-- Service role can manage events
CREATE POLICY "Service role can manage events" 
ON events FOR ALL 
USING (auth.role() = 'service_role');

-- Create index for location-based queries
CREATE INDEX idx_events_location ON events(latitude, longitude);
CREATE INDEX idx_events_dates ON events(start_date, end_date);
CREATE INDEX idx_claim_sale_items_location ON claim_sale_items(latitude, longitude);