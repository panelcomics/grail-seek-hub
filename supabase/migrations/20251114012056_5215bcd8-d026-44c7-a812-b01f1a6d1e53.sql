-- Fix WARN: Make chat-images bucket private (idempotent version)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete their own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can access their own chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own chat folder" ON storage.objects;

-- Make bucket private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'chat-images';

-- Recreate RLS policies
CREATE POLICY "Users can access their own chat images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload to their own chat folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own chat images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);