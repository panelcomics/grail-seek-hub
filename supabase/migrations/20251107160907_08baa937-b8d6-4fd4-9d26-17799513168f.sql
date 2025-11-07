-- Add refund_amount column to orders table to track refund amounts
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS refund_amount numeric DEFAULT 0;