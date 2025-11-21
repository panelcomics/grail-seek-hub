-- Add certification_number field for slab cert/barcode numbers
ALTER TABLE inventory_items 
ADD COLUMN certification_number TEXT;

COMMENT ON COLUMN inventory_items.certification_number IS 'Certification/barcode number from grading company (CGC/CBCS/PGX/PSA)';
