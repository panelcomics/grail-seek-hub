-- Fix base64 images in listings table
-- Replace any base64-encoded image_url with NULL (should be URLs, not data)
UPDATE listings 
SET image_url = NULL 
WHERE image_url LIKE 'data:image%';

-- Fix base64 images in inventory_items.images.primary
-- This updates any JSONB primary field that contains base64 data
UPDATE inventory_items
SET images = jsonb_set(
  COALESCE(images, '{}'::jsonb), 
  '{primary}', 
  'null'::jsonb
)
WHERE images->>'primary' LIKE 'data:image%';

-- Normalize NULL or malformed images structure
-- Ensure all inventory items have proper {primary: null, others: []} structure
UPDATE inventory_items
SET images = '{"primary": null, "others": []}'::jsonb
WHERE images IS NULL 
   OR images = 'null'::jsonb 
   OR NOT (images ? 'primary' AND images ? 'others');