-- Create seller_featured table
CREATE TABLE public.seller_featured (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  featured_from timestamp with time zone NOT NULL DEFAULT now(),
  featured_to timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_featured ENABLE ROW LEVEL SECURITY;

-- Anyone can view active featured sellers
CREATE POLICY "Anyone can view active featured sellers"
  ON public.seller_featured
  FOR SELECT
  USING (active = true);

-- Admins can manage featured sellers
CREATE POLICY "Admins can manage featured sellers"
  ON public.seller_featured
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_seller_featured_updated_at
  BEFORE UPDATE ON public.seller_featured
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_seller_featured_active_rank ON public.seller_featured(active, rank) WHERE active = true;