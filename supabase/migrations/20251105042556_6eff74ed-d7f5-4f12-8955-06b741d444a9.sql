-- Add notification preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_auction_ending boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_new_posts boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_via_email boolean DEFAULT true;

-- Create notification_sent table to track deduplication
CREATE TABLE IF NOT EXISTS public.notification_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  reference_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type, reference_id)
);

-- Enable RLS
ALTER TABLE public.notification_sent ENABLE ROW LEVEL SECURITY;

-- Policies for notification_sent
CREATE POLICY "Service role can manage notification tracking"
  ON public.notification_sent
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster deduplication checks
CREATE INDEX idx_notification_sent_lookup ON public.notification_sent(user_id, notification_type, reference_id);