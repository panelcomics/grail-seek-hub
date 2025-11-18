-- Create public-safe view of profiles that only exposes non-sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  username,
  display_name,
  avatar_url,
  profile_image_url,
  bio,
  joined_at,
  is_verified_seller,
  verified_artist,
  is_featured_seller,
  -- Aggregated metrics only (not exact counts)
  CASE 
    WHEN completed_sales_count > 50 THEN '50+'
    WHEN completed_sales_count > 10 THEN '10+'
    ELSE 'New'
  END as seller_level,
  -- Safe to show: public seller information
  seller_tier
FROM public.profiles;

-- Grant public access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Update profiles table RLS policies to restrict sensitive data access
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Allow users to view their own full profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));