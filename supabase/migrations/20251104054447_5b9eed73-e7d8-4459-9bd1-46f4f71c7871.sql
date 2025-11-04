-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create scanned_items table for storing AI scan results
CREATE TABLE IF NOT EXISTS public.scanned_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  grade TEXT NOT NULL,
  condition TEXT NOT NULL,
  estimated_value NUMERIC NOT NULL,
  image_url TEXT,
  scan_data JSONB,
  comparable_sales JSONB,
  is_listed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scanned_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own scanned items
CREATE POLICY "Users can view their own scanned items"
ON public.scanned_items
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own scanned items
CREATE POLICY "Users can create their own scanned items"
ON public.scanned_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scanned items
CREATE POLICY "Users can update their own scanned items"
ON public.scanned_items
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own scanned items
CREATE POLICY "Users can delete their own scanned items"
ON public.scanned_items
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_scanned_items_updated_at
BEFORE UPDATE ON public.scanned_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();