-- Update original_art RLS policies to include artist access
DROP POLICY IF EXISTS "Artists can view their own art" ON public.original_art;
DROP POLICY IF EXISTS "Artists can insert their own art" ON public.original_art;
DROP POLICY IF EXISTS "Artists can update their own art" ON public.original_art;

CREATE POLICY "Artists can view their own art"
  ON public.original_art
  FOR SELECT
  USING (
    has_role(auth.uid(), 'artist'::app_role) AND owner_user_id = auth.uid()
  );

CREATE POLICY "Artists can insert their own art"
  ON public.original_art
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'artist'::app_role) AND owner_user_id = auth.uid()
  );

CREATE POLICY "Artists can update their own art"
  ON public.original_art
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'artist'::app_role) AND owner_user_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'artist'::app_role) AND owner_user_id = auth.uid()
  );

-- Create table for artist removal requests
CREATE TABLE public.art_removal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  art_id UUID NOT NULL REFERENCES public.original_art(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.art_removal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists can create removal requests for their art"
  ON public.art_removal_requests
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'artist'::app_role) AND artist_id = auth.uid()
  );

CREATE POLICY "Artists can view their own removal requests"
  ON public.art_removal_requests
  FOR SELECT
  USING (
    has_role(auth.uid(), 'artist'::app_role) AND artist_id = auth.uid()
  );

CREATE POLICY "Admins can view all removal requests"
  ON public.art_removal_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update removal requests"
  ON public.art_removal_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));