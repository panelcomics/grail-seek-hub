-- Create my_grails table to store scanned comics
CREATE TABLE IF NOT EXISTS public.my_grails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comicvine_id INTEGER,
  title TEXT NOT NULL,
  issue_number TEXT,
  full_title TEXT,
  publisher TEXT,
  year INTEGER,
  cover_image TEXT,
  cover_thumb TEXT,
  description TEXT,
  characters TEXT[],
  ebay_avg_price NUMERIC(10,2),
  trade_fee_total NUMERIC(10,2),
  trade_fee_each NUMERIC(10,2),
  fee_tier TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.my_grails ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see and manage their own grails
CREATE POLICY "Users can view their own grails"
  ON public.my_grails
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grails"
  ON public.my_grails
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grails"
  ON public.my_grails
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grails"
  ON public.my_grails
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_my_grails_user_id ON public.my_grails(user_id);
CREATE INDEX idx_my_grails_comicvine_id ON public.my_grails(comicvine_id);

-- Trigger for updated_at
CREATE TRIGGER update_my_grails_updated_at
  BEFORE UPDATE ON public.my_grails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
