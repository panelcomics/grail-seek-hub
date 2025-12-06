-- Add signature fields to inventory_items (non-breaking, all nullable with defaults)
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS is_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_type text,
ADD COLUMN IF NOT EXISTS signed_by text,
ADD COLUMN IF NOT EXISTS signature_date text;

-- Add signature fields to listings table for display purposes
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS is_signed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS signature_type text,
ADD COLUMN IF NOT EXISTS signed_by text,
ADD COLUMN IF NOT EXISTS signature_date text;