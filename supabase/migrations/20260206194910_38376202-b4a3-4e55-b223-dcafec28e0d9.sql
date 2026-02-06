
-- ============================================================
-- SECURITY FIX: Listings private_notes exposure
-- The listings.private_notes column is unused (0 rows with data)
-- and exposes through the public "Anyone can view active listings" RLS policy.
-- Private notes live on inventory_items which has owner-only RLS.
-- ============================================================
ALTER TABLE public.listings DROP COLUMN IF EXISTS private_notes;

-- ============================================================
-- SECURITY FIX: Profiles table public data exposure
-- The "Public seller profiles viewable by authenticated users" policy
-- with USING(true) exposes ALL profile columns to any authenticated user,
-- including sensitive fields like stripe_account_id, custom_fee_rate,
-- postal_code, lat/lng, shipping_address.
-- 
-- Fix: Drop the overly permissive policy and expand the public_profiles
-- view to include marketplace-needed fields so cross-user queries can
-- use the view instead.
-- ============================================================

-- 1. Update public_profiles view to include marketplace fields
-- Preserves original column order, adds new safe columns at the end
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
  CASE
    WHEN completed_sales_count > 50 THEN '50+'
    WHEN completed_sales_count > 10 THEN '10+'
    ELSE 'New'
  END AS seller_level,
  seller_tier,
  -- New marketplace fields (safe for public display)
  is_founding_seller,
  COALESCE(completed_sales_count, 0) AS completed_sales_count,
  COALESCE(completed_purchases_count, 0) AS completed_purchases_count,
  COALESCE(favorites_total, 0) AS favorites_total,
  city,
  state,
  country,
  -- Rounded lat/lng for approximate location (1km precision, protects exact address)
  ROUND(lat::numeric, 2) AS lat,
  ROUND(lng::numeric, 2) AS lng
FROM profiles;

-- 2. Ensure proper grants on the updated view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- 3. Drop the overly permissive profiles SELECT policy
-- Owner policy (auth.uid() = user_id) and Admin policy remain intact
DROP POLICY IF EXISTS "Public seller profiles viewable by authenticated users" ON public.profiles;
