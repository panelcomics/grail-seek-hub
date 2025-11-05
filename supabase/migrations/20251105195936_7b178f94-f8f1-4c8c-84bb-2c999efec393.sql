-- Create comics library table
CREATE TABLE public.comics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series TEXT NOT NULL,
  issue TEXT,
  year TEXT,
  publisher TEXT,
  creators TEXT[],
  cover_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comics ENABLE ROW LEVEL SECURITY;

-- Comics policies - users can only access their own comics
CREATE POLICY "Users can view their own comics"
  ON public.comics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own comics"
  ON public.comics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comics"
  ON public.comics
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comics"
  ON public.comics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_comics_updated_at
  BEFORE UPDATE ON public.comics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add 'user' to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'user' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'user';
  END IF;
END $$;