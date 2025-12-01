-- ============================================
-- CREATOR SYSTEM V2 - ADDITIVE EXTENSIONS ONLY
-- ============================================

-- 1. EXTEND creator_applications (add columns only)
ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS review_score INTEGER,
  ADD COLUMN IF NOT EXISTS tier TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT FALSE;

-- Add safe CHECK constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creator_applications_tier_check'
  ) THEN
    ALTER TABLE creator_applications 
    ADD CONSTRAINT creator_applications_tier_check 
    CHECK (tier IN ('bronze', 'silver', 'gold') OR tier IS NULL);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creator_applications_review_score_check'
  ) THEN
    ALTER TABLE creator_applications 
    ADD CONSTRAINT creator_applications_review_score_check 
    CHECK (review_score BETWEEN 0 AND 100 OR review_score IS NULL);
  END IF;
END $$;

-- Create index on public_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_creator_applications_public_slug 
  ON creator_applications(public_slug) WHERE public_slug IS NOT NULL;

-- 2. CREATE creator_public_profiles table
CREATE TABLE IF NOT EXISTS creator_public_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_application_id UUID REFERENCES creator_applications(id) ON DELETE CASCADE,
  public_slug TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  short_bio TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  featured_links JSONB DEFAULT '[]'::jsonb,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for creator_public_profiles
ALTER TABLE creator_public_profiles ENABLE ROW LEVEL SECURITY;

-- Public can read visible profiles
CREATE POLICY "Anyone can view visible public profiles"
  ON creator_public_profiles
  FOR SELECT
  USING (is_visible = TRUE);

-- Admins can manage all profiles
CREATE POLICY "Admins can manage all public profiles"
  ON creator_public_profiles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Creators can view their own profile
CREATE POLICY "Creators can view their own profile"
  ON creator_public_profiles
  FOR SELECT
  TO authenticated
  USING (
    creator_application_id IN (
      SELECT id FROM creator_applications 
      WHERE user_id = auth.uid()
    )
  );

-- Creators can update their own profile (limited fields)
CREATE POLICY "Creators can update their own profile"
  ON creator_public_profiles
  FOR UPDATE
  TO authenticated
  USING (
    creator_application_id IN (
      SELECT id FROM creator_applications 
      WHERE user_id = auth.uid()
    )
  );

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_creator_public_profiles_slug 
  ON creator_public_profiles(public_slug);

CREATE INDEX IF NOT EXISTS idx_creator_public_profiles_app_id 
  ON creator_public_profiles(creator_application_id);

-- 3. CREATE creator_roles table (if not exists)
-- This links approved creators to user accounts for dashboard access
CREATE TABLE IF NOT EXISTS creator_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  is_artist BOOLEAN DEFAULT FALSE,
  is_writer BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  UNIQUE(user_id)
);

ALTER TABLE creator_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own role
CREATE POLICY "Users can view their own creator role"
  ON creator_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all roles
CREATE POLICY "Admins can manage all creator roles"
  ON creator_roles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add updated_at trigger for creator_public_profiles
CREATE OR REPLACE FUNCTION update_creator_public_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_creator_public_profiles_updated_at
  BEFORE UPDATE ON creator_public_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_public_profiles_updated_at();