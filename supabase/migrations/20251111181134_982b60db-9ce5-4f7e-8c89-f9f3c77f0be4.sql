-- Add profile fields if they don't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS profile_image_url text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT now();

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Update existing profiles to set joined_at if null
UPDATE profiles SET joined_at = created_at WHERE joined_at IS NULL;

-- Drop existing policies if they exist and recreate them
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
END $$;

-- Create RLS policies for profile image uploads
CREATE POLICY "Users can upload their own profile images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Profile images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Users can update their own profile images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);