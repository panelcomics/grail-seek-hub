-- Create storage bucket for user comic photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('comic-photos', 'comic-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow users to upload their own comic photos
CREATE POLICY "Users can upload their own comic photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comic-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own comic photos
CREATE POLICY "Users can view their own comic photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comic-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to comic photos
CREATE POLICY "Public can view comic photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'comic-photos');