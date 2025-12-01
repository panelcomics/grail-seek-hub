-- Expand creator_applications table with comprehensive fields
ALTER TABLE creator_applications
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS creator_type TEXT,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS sample_files JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS requested_access JSONB DEFAULT '[]';

-- Add CHECK constraint for creator_type
ALTER TABLE creator_applications
ADD CONSTRAINT creator_type_check 
CHECK (creator_type IN ('artist', 'writer', 'colorist', 'cover_artist', 'publisher', 'grailfunding_creator'));

-- Add CHECK constraint for status (if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creator_applications_status_check'
  ) THEN
    ALTER TABLE creator_applications
    ADD CONSTRAINT creator_applications_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Create storage bucket for creator sample files
INSERT INTO storage.buckets (id, name, public)
VALUES ('creator-samples', 'creator-samples', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for creator-samples bucket
CREATE POLICY "Authenticated users can upload creator samples"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'creator-samples');

CREATE POLICY "Admins can view all creator samples"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'creator-samples' 
  AND (
    auth.uid() IN (SELECT user_id FROM creator_applications WHERE id = (storage.foldername(name))[1]::uuid)
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

-- Update existing applications to have default values
UPDATE creator_applications
SET 
  creator_type = CASE 
    WHEN role_requested = 'artist' THEN 'artist'
    WHEN role_requested = 'writer' THEN 'writer'
    ELSE 'artist'
  END,
  requested_access = CASE
    WHEN role_requested = 'artist' THEN '["original_art"]'::jsonb
    WHEN role_requested = 'writer' THEN '["grailfunding"]'::jsonb
    WHEN role_requested = 'both' THEN '["original_art", "grailfunding"]'::jsonb
    ELSE '[]'::jsonb
  END
WHERE creator_type IS NULL;