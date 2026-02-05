-- Add feature flag for Invoice Order View
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'enable_invoice_order_view',
  'false',
  'Enable HipComic-style invoice order detail view for buyers and sellers'
)
ON CONFLICT (key) DO NOTHING;