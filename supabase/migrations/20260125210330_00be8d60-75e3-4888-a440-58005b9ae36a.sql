-- Add raw_input column to scan_events for storing original user input before normalization
ALTER TABLE public.scan_events
ADD COLUMN raw_input TEXT;