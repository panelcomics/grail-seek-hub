-- Fix inventory_items where title appears to be a ComicVine story title instead of series name
-- Move story titles to variant_description and use volume_name or series as the main title

UPDATE inventory_items
SET 
  variant_description = CASE 
    WHEN variant_description IS NULL OR variant_description = '' THEN title
    ELSE variant_description
  END,
  title = COALESCE(
    NULLIF(volume_name, ''),
    NULLIF(series, ''),
    title
  )
WHERE 
  -- Only update records where title appears to be a story title (short and different from series/volume)
  (LENGTH(title) < 50 
   AND (title ILIKE '%!%' OR title ILIKE '%?%' OR title ILIKE '%/%' OR title ILIKE '%:%')
   AND title != COALESCE(volume_name, '')
   AND title != COALESCE(series, ''))
  -- Or where we have a volume_name/series that's clearly different and longer
  OR (COALESCE(volume_name, series) IS NOT NULL 
      AND LENGTH(COALESCE(volume_name, series)) > LENGTH(title)
      AND title != COALESCE(volume_name, series));