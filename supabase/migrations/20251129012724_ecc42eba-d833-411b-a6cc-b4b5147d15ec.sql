-- Add shipping_address column to profiles table for storing shipping info as JSON
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS shipping_address JSONB DEFAULT NULL;

-- Add onboarding_completed flag to track completion
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;