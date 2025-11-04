-- Add fields to claim_sales for seller location and description
ALTER TABLE claim_sales
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Create storage bucket for claim sale images
INSERT INTO storage.buckets (id, name, public)
VALUES ('claim-sale-images', 'claim-sale-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for claim sale images
CREATE POLICY "Anyone can view claim sale images"
ON storage.objects FOR SELECT
USING (bucket_id = 'claim-sale-images');

CREATE POLICY "Authenticated users can upload claim sale images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'claim-sale-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own claim sale images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'claim-sale-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own claim sale images"
ON storage.objects FOR DELETE
USING (bucket_id = 'claim-sale-images' AND auth.uid()::text = (storage.foldername(name))[1]);