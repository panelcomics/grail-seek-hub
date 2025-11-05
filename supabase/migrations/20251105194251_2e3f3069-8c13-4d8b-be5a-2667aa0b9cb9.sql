-- Create original_art table
CREATE TABLE public.original_art (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  image_url TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  description TEXT,
  date_created DATE,
  medium TEXT,
  dimensions TEXT,
  tags TEXT[],
  for_sale BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC,
  provenance TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.original_art ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can view all original art"
  ON public.original_art
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert original art"
  ON public.original_art
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update original art"
  ON public.original_art
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete original art"
  ON public.original_art
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_original_art_updated_at
  BEFORE UPDATE ON public.original_art
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for original art
INSERT INTO storage.buckets (id, name, public)
VALUES ('original-art', 'original-art', false);

-- Storage policies for original art bucket
CREATE POLICY "Admins can upload original art images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'original-art' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can view original art images"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'original-art' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update original art images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'original-art' AND
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete original art images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'original-art' AND
    has_role(auth.uid(), 'admin'::app_role)
  );