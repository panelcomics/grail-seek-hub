-- Add verified_artist field to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS verified_artist boolean DEFAULT false;

-- Create artist_applications table
CREATE TABLE IF NOT EXISTS artist_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name text NOT NULL,
  portfolio_url text,
  instagram_url text,
  sample_images text[] NOT NULL,
  coa_signature_url text,
  confirmed_creator boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE artist_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view their own artist applications"
ON artist_applications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own applications
CREATE POLICY "Users can create artist applications"
ON artist_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending applications
CREATE POLICY "Users can update their own pending applications"
ON artist_applications
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all applications
CREATE POLICY "Admins can view all artist applications"
ON artist_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all applications
CREATE POLICY "Admins can update artist applications"
ON artist_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for artist verification samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-verification', 'artist-verification', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artist verification
CREATE POLICY "Users can upload their own verification samples"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'artist-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own verification samples"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'artist-verification' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all verification samples"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'artist-verification' AND
  has_role(auth.uid(), 'admin')
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_artist_applications_status ON artist_applications(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_artist_applications_user ON artist_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_verified_artist ON profiles(verified_artist) WHERE verified_artist = true;

-- Update timestamp trigger
CREATE TRIGGER update_artist_applications_updated_at
BEFORE UPDATE ON artist_applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();