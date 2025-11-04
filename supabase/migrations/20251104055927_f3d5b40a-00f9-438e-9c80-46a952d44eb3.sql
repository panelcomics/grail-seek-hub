-- Create user_ratings table for post-meetup reviews
CREATE TABLE IF NOT EXISTS public.user_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL,
  reviewed_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  transaction_type TEXT CHECK (transaction_type IN ('trade', 'purchase', 'meetup')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table for achievements
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trade_posts table for trade board
CREATE TABLE IF NOT EXISTS public.trade_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  offering_items TEXT[] NOT NULL,
  seeking_items TEXT[] NOT NULL,
  location_city TEXT,
  location_state TEXT,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trade_comments table for trade chat
CREATE TABLE IF NOT EXISTS public.trade_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_post_id UUID NOT NULL REFERENCES public.trade_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_comments ENABLE ROW LEVEL SECURITY;

-- User ratings policies
CREATE POLICY "Anyone can view ratings"
ON public.user_ratings FOR SELECT
USING (true);

CREATE POLICY "Users can create ratings"
ON public.user_ratings FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

-- User badges policies
CREATE POLICY "Anyone can view badges"
ON public.user_badges FOR SELECT
USING (true);

CREATE POLICY "Service role can manage badges"
ON public.user_badges FOR ALL
USING (auth.role() = 'service_role'::text);

-- Trade posts policies
CREATE POLICY "Anyone can view active trade posts"
ON public.trade_posts FOR SELECT
USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can create trade posts"
ON public.trade_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade posts"
ON public.trade_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade posts"
ON public.trade_posts FOR DELETE
USING (auth.uid() = user_id);

-- Trade comments policies
CREATE POLICY "Anyone can view comments on active posts"
ON public.trade_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.trade_posts
    WHERE trade_posts.id = trade_comments.trade_post_id
    AND trade_posts.is_active = true
  )
);

CREATE POLICY "Users can create comments"
ON public.trade_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.trade_comments FOR DELETE
USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_trade_posts_updated_at
BEFORE UPDATE ON public.trade_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate user average rating
CREATE OR REPLACE FUNCTION public.get_user_rating(target_user_id UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_ratings BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ROUND(AVG(rating)::numeric, 1) as average_rating,
    COUNT(*) as total_ratings
  FROM user_ratings
  WHERE reviewed_user_id = target_user_id;
$$;