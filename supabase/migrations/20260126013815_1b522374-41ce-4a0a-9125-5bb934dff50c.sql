-- Add input_source column to scan_events to distinguish OCR vs typed vs image inputs
ALTER TABLE public.scan_events
ADD COLUMN input_source TEXT CHECK (input_source IN ('typed', 'ocr', 'image'));