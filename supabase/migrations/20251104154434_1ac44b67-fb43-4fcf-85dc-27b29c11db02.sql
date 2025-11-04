-- Add is_winner field to claims table
ALTER TABLE claims ADD COLUMN is_winner BOOLEAN DEFAULT FALSE;

-- Update RLS policy to allow viewing winning claims
CREATE POLICY "Anyone can view winning claims"
ON claims
FOR SELECT
USING (is_winner = true);

-- Add index for faster queries
CREATE INDEX idx_claims_sale_timestamp ON claims(claim_sale_id, claimed_at ASC);
CREATE INDEX idx_claims_winners ON claims(claim_sale_id, is_winner) WHERE is_winner = true;