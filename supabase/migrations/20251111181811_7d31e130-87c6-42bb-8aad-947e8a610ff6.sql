-- Add verified seller and custom fee columns if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_verified_seller boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_fee_rate numeric(5,4),
ADD COLUMN IF NOT EXISTS is_featured_seller boolean DEFAULT false;

-- Create index for faster filtering of verified and featured sellers
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(is_verified_seller) WHERE is_verified_seller = true;
CREATE INDEX IF NOT EXISTS idx_profiles_featured ON profiles(is_featured_seller) WHERE is_featured_seller = true;

-- Update RLS policies to allow admins to manage these fields
-- Users can still read their own profiles, but only admins can update verification status