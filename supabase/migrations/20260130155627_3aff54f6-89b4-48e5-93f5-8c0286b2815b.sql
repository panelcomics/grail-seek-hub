-- Add RLS policy for public viewing of original art with visibility='public'
CREATE POLICY "Anyone can view public original art"
  ON public.original_art
  FOR SELECT
  USING (visibility = 'public' AND for_sale = true);