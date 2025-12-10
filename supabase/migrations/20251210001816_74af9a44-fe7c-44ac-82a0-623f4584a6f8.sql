-- ==========================================================================
-- ELITE FEATURES PHASE 3: Portfolio & Trending Tables
-- ==========================================================================

-- User collection for portfolio tracking (Elite feature)
CREATE TABLE public.user_collection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  comic_title TEXT NOT NULL,
  issue_number TEXT,
  variant TEXT,
  publisher TEXT,
  year INTEGER,
  grade_estimate TEXT,
  purchase_price NUMERIC(10,2),
  purchase_date DATE,
  current_value NUMERIC(10,2),
  last_value_refresh TIMESTAMP WITH TIME ZONE,
  value_7d_change NUMERIC(10,2),
  value_30d_change NUMERIC(10,2),
  cover_image_url TEXT,
  notes TEXT,
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_collection ENABLE ROW LEVEL SECURITY;

-- Users can manage their own collection
CREATE POLICY "Users can manage their own collection"
  ON public.user_collection
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_user_collection_user_id ON public.user_collection(user_id);
CREATE INDEX idx_user_collection_created_at ON public.user_collection(created_at DESC);

-- Trending comics table for caching trending data
CREATE TABLE public.trending_comics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comic_title TEXT NOT NULL,
  issue_number TEXT,
  publisher TEXT,
  year INTEGER,
  cover_image_url TEXT,
  avg_sold_price NUMERIC(10,2),
  sold_count INTEGER NOT NULL DEFAULT 0,
  price_change_7d NUMERIC(5,2), -- percentage change
  price_change_30d NUMERIC(5,2),
  heat_score INTEGER NOT NULL DEFAULT 0, -- 0-100
  sell_through_rate NUMERIC(5,2),
  rank INTEGER NOT NULL,
  last_refreshed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS - read-only for all authenticated users
ALTER TABLE public.trending_comics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending comics"
  ON public.trending_comics
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage trending comics"
  ON public.trending_comics
  FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role');

-- Create index for ranking
CREATE INDEX idx_trending_comics_rank ON public.trending_comics(rank);
CREATE INDEX idx_trending_comics_heat_score ON public.trending_comics(heat_score DESC);

-- AI condition assessments cache (optional, for storing AI results)
CREATE TABLE public.ai_condition_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  grade_range_low NUMERIC(3,1),
  grade_range_high NUMERIC(3,1),
  condition_notes TEXT,
  spine_condition TEXT,
  corner_condition TEXT,
  surface_condition TEXT,
  gloss_condition TEXT,
  pressing_potential TEXT, -- 'low', 'medium', 'high'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_condition_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assessments"
  ON public.ai_condition_assessments
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_ai_condition_assessments_user_id ON public.ai_condition_assessments(user_id);
CREATE INDEX idx_ai_condition_assessments_inventory_item ON public.ai_condition_assessments(inventory_item_id);

-- Trigger for updated_at on user_collection
CREATE TRIGGER update_user_collection_updated_at
  BEFORE UPDATE ON public.user_collection
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();