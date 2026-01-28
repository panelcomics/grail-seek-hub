-- Make creator-samples bucket public so admins can view sample files
UPDATE storage.buckets SET public = true WHERE id = 'creator-samples';

-- Ensure there's a public read policy for the bucket
CREATE POLICY "Public read access for creator samples"
ON storage.objects FOR SELECT
USING (bucket_id = 'creator-samples');