-- Add is_demo field to campaigns table
ALTER TABLE campaigns 
ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- Add index for filtering demo campaigns
CREATE INDEX idx_campaigns_is_demo ON campaigns(is_demo);

-- Add comment for documentation
COMMENT ON COLUMN campaigns.is_demo IS 'Marks demo campaigns used for Beta testing and UI showcase';
