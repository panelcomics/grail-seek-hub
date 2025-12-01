-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  short_tagline TEXT NOT NULL,
  cover_image_url TEXT,
  video_url TEXT,
  category TEXT NOT NULL,
  funding_goal_cents INTEGER NOT NULL,
  current_pledged_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'successful', 'failed', 'cancelled')),
  location TEXT,
  story_markdown TEXT,
  risks_markdown TEXT,
  updates_count INTEGER NOT NULL DEFAULT 0,
  backers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create campaign_rewards table
CREATE TABLE IF NOT EXISTS public.campaign_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  pledge_amount_cents INTEGER NOT NULL,
  estimated_delivery_date DATE,
  limit_quantity INTEGER,
  claimed_quantity INTEGER NOT NULL DEFAULT 0,
  includes_shipping BOOLEAN NOT NULL DEFAULT true,
  is_digital BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create campaign_pledges table
CREATE TABLE IF NOT EXISTS public.campaign_pledges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES public.campaign_rewards(id) ON DELETE SET NULL,
  backer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'refunded', 'failed')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create campaign_stretch_goals table
CREATE TABLE IF NOT EXISTS public.campaign_stretch_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  target_amount_cents INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create campaign_updates table
CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create campaign_comments table
CREATE TABLE IF NOT EXISTS public.campaign_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create campaign_notifications table
CREATE TABLE IF NOT EXISTS public.campaign_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('campaign_launched', 'goal_reached', 'new_update', 'new_comment', 'new_pledge')),
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_creator_id ON public.campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_ends_at ON public.campaigns(ends_at);
CREATE INDEX IF NOT EXISTS idx_campaign_rewards_campaign_id ON public.campaign_rewards(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_pledges_campaign_id ON public.campaign_pledges(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_pledges_backer_id ON public.campaign_pledges(backer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_stretch_goals_campaign_id ON public.campaign_stretch_goals(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign_id ON public.campaign_updates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON public.campaign_comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_notifications_user_id ON public.campaign_notifications(user_id);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_stretch_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaigns
CREATE POLICY "Anyone can view live campaigns" ON public.campaigns
  FOR SELECT USING (status = 'live' OR status = 'successful' OR status = 'failed');

CREATE POLICY "Creators can view their own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Creators can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = creator_id);

-- RLS Policies for campaign_rewards
CREATE POLICY "Anyone can view rewards for visible campaigns" ON public.campaign_rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_rewards.campaign_id 
      AND (campaigns.status IN ('live', 'successful', 'failed') OR campaigns.creator_id = auth.uid())
    )
  );

CREATE POLICY "Creators can manage rewards for their campaigns" ON public.campaign_rewards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_rewards.campaign_id 
      AND campaigns.creator_id = auth.uid()
    )
  );

-- RLS Policies for campaign_pledges
CREATE POLICY "Backers can view their own pledges" ON public.campaign_pledges
  FOR SELECT USING (auth.uid() = backer_id);

CREATE POLICY "Creators can view pledges for their campaigns" ON public.campaign_pledges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_pledges.campaign_id 
      AND campaigns.creator_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create pledges" ON public.campaign_pledges
  FOR INSERT WITH CHECK (auth.uid() = backer_id);

-- RLS Policies for campaign_stretch_goals
CREATE POLICY "Anyone can view stretch goals for visible campaigns" ON public.campaign_stretch_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_stretch_goals.campaign_id 
      AND (campaigns.status IN ('live', 'successful', 'failed') OR campaigns.creator_id = auth.uid())
    )
  );

CREATE POLICY "Creators can manage stretch goals for their campaigns" ON public.campaign_stretch_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_stretch_goals.campaign_id 
      AND campaigns.creator_id = auth.uid()
    )
  );

-- RLS Policies for campaign_updates
CREATE POLICY "Anyone can view public updates for visible campaigns" ON public.campaign_updates
  FOR SELECT USING (
    is_public = true AND EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_updates.campaign_id 
      AND (campaigns.status IN ('live', 'successful', 'failed') OR campaigns.creator_id = auth.uid())
    )
  );

CREATE POLICY "Creators can manage updates for their campaigns" ON public.campaign_updates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_updates.campaign_id 
      AND campaigns.creator_id = auth.uid()
    )
  );

-- RLS Policies for campaign_comments
CREATE POLICY "Anyone can view comments for visible campaigns" ON public.campaign_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = campaign_comments.campaign_id 
      AND campaigns.status IN ('live', 'successful', 'failed')
    )
  );

CREATE POLICY "Authenticated users can create comments" ON public.campaign_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own comments" ON public.campaign_comments
  FOR DELETE USING (auth.uid() = author_id);

-- RLS Policies for campaign_notifications
CREATE POLICY "Users can view their own notifications" ON public.campaign_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.campaign_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

CREATE TRIGGER campaign_rewards_updated_at
  BEFORE UPDATE ON public.campaign_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();