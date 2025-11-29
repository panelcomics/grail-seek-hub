-- Backfill onboarding_completed for existing users
-- Users who already have username AND postal_code are considered onboarded
UPDATE profiles
SET onboarding_completed = true
WHERE username IS NOT NULL 
  AND postal_code IS NOT NULL 
  AND (onboarding_completed IS NULL OR onboarding_completed = false);

-- Add helpful comment
COMMENT ON COLUMN profiles.onboarding_completed IS 'Tracks if user completed the 2-step onboarding flow (username + location)';