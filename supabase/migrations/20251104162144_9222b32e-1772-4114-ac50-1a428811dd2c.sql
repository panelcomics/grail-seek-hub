-- Add hide_ai_scanner_tour to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS hide_ai_scanner_tour boolean DEFAULT false;