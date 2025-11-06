-- Add condition_notes column to user_comics
ALTER TABLE public.user_comics 
ADD COLUMN IF NOT EXISTS condition_notes text;