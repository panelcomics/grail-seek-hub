-- Add Baselane Pack v1 feature flags to app_settings (unified flag system)
-- These default to false and can be toggled via admin UI

INSERT INTO app_settings (key, value, description)
VALUES 
  ('enable_baselane_pack_v1', 'false', 'Master toggle for Baselane marketplace rails features'),
  ('enable_order_timeline', 'false', 'Show order timeline/status tracking on order pages'),
  ('enable_seller_wallet', 'false', 'Enable seller wallet with pending/available/on-hold balances'),
  ('enable_earnings_dashboard', 'false', 'Enable seller earnings and fees dashboard with CSV export'),
  ('enable_risk_holds', 'false', 'Enable risk assessment and payout holds for high-risk orders'),
  ('enable_notifications', 'false', 'Enable notifications center for buyers and sellers')
ON CONFLICT (key) DO NOTHING;