-- Add columns to user_comics for custom OCR entries
ALTER TABLE public.user_comics 
ADD COLUMN IF NOT EXISTS ocr_text text,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'comicvine',
ADD COLUMN IF NOT EXISTS photo_base64 text;