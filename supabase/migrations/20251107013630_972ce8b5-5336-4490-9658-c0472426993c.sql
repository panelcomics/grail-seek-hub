-- Drop existing policies on user_comic_images
DROP POLICY IF EXISTS "Users can view images for their comics" ON public.user_comic_images;
DROP POLICY IF EXISTS "Users can insert images for their comics" ON public.user_comic_images;
DROP POLICY IF EXISTS "Users can update images for their comics" ON public.user_comic_images;
DROP POLICY IF EXISTS "Users can delete images for their comics" ON public.user_comic_images;

-- Create consolidated secure policies for user_comic_images

-- Owners can read their own comic images
CREATE POLICY "read images by owner"
ON public.user_comic_images 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_comics uc
    WHERE uc.id = user_comic_images.comic_id
      AND uc.user_id = auth.uid()
  )
);

-- Owners can insert/update/delete their own comic images
CREATE POLICY "write images by owner"
ON public.user_comic_images 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_comics uc
    WHERE uc.id = user_comic_images.comic_id
      AND uc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_comics uc
    WHERE uc.id = user_comic_images.comic_id
      AND uc.user_id = auth.uid()
  )
  AND auth.uid() = created_by
);