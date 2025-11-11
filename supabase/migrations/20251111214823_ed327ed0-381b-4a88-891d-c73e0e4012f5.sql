-- Fix RLS policy for comic-photos bucket to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload comic photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comic-photos'
);

-- Allow authenticated users to read their own uploads
CREATE POLICY "Allow users to read comic photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'comic-photos');