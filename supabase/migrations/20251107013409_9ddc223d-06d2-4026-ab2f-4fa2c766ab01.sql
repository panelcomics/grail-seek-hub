-- Create table for storing multiple images per comic
CREATE TABLE IF NOT EXISTS public.user_comic_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comic_id UUID NOT NULL REFERENCES public.user_comics(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Ensure only one cover image per comic
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_cover_per_comic
ON public.user_comic_images (comic_id)
WHERE is_cover = true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_comic_images_comic_id 
ON public.user_comic_images(comic_id);

-- Enable RLS
ALTER TABLE public.user_comic_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can manage images for their own comics
CREATE POLICY "Users can view images for their comics"
ON public.user_comic_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_comics
    WHERE user_comics.id = user_comic_images.comic_id
    AND user_comics.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert images for their comics"
ON public.user_comic_images
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_comics
    WHERE user_comics.id = user_comic_images.comic_id
    AND user_comics.user_id = auth.uid()
  )
  AND auth.uid() = created_by
);

CREATE POLICY "Users can update images for their comics"
ON public.user_comic_images
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_comics
    WHERE user_comics.id = user_comic_images.comic_id
    AND user_comics.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete images for their comics"
ON public.user_comic_images
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_comics
    WHERE user_comics.id = user_comic_images.comic_id
    AND user_comics.user_id = auth.uid()
  )
);

-- Add RLS policies for the comic-photos storage bucket
CREATE POLICY "Users can upload images to their comic folders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comic-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own comic images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'comic-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own comic images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'comic-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own comic images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'comic-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public viewing of comic images since the bucket is public
CREATE POLICY "Anyone can view comic images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'comic-photos');