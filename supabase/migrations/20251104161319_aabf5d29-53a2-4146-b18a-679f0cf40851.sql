-- Add terms acceptance tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_version_accepted text,
ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp with time zone;