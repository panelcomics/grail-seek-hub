-- Drop the existing view and recreate as a regular view
DROP VIEW IF EXISTS inventory_items_public;

CREATE VIEW inventory_items_public AS
SELECT 
  id,
  owner_id,
  title,
  issue_number,
  series,
  publisher,
  grade,
  cgc_grade,
  condition,
  cover_date,
  images,
  comicvine_issue_id,
  created_at,
  updated_at
FROM inventory_items;