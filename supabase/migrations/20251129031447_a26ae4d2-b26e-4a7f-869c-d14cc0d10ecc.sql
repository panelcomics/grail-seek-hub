
-- Allow authenticated users to view public seller profiles for marketplace features
-- This is required for Local Deals, seller pages, and listing cards to work
CREATE POLICY "Public seller profiles viewable by authenticated users"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Add helpful comment
COMMENT ON TABLE profiles IS 'User profiles - public fields (username, display_name, location, seller stats) are viewable by all authenticated users for marketplace functionality';
