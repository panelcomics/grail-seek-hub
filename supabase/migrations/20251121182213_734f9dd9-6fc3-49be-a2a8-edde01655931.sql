-- Add grading_company column to inventory_items table
ALTER TABLE inventory_items
ADD COLUMN grading_company TEXT NULL;

COMMENT ON COLUMN inventory_items.grading_company IS 'Grading company name (CGC, CBCS, PGX, etc.) for slabbed comics';