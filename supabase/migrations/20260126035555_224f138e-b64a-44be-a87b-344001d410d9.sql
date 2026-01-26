-- Add used_ocr boolean to track OCR usage separately from input_source
ALTER TABLE public.scan_events 
ADD COLUMN IF NOT EXISTS used_ocr BOOLEAN DEFAULT false;

-- Add request_id to tie related events together
ALTER TABLE public.scan_events 
ADD COLUMN IF NOT EXISTS request_id UUID;

-- Add request_id to scan_corrections for correlation
ALTER TABLE public.scan_corrections 
ADD COLUMN IF NOT EXISTS request_id UUID;

-- Create index for request_id filtering
CREATE INDEX IF NOT EXISTS idx_scan_events_request_id ON public.scan_events(request_id);
CREATE INDEX IF NOT EXISTS idx_scan_corrections_request_id ON public.scan_corrections(request_id);