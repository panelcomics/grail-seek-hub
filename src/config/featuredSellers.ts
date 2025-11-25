/**
 * Featured sellers configuration
 * Maps display names to seller user IDs for Featured Shop carousels
 * 
 * To add a new featured seller:
 * 1. Get their user_id from the profiles table in Supabase
 * 2. Add an entry here with a descriptive key
 * 3. Reference this config in Index.tsx when rendering PremiumDealerCarousel
 */

export interface FeaturedSeller {
  sellerId: string;
  displayName: string;
  tier?: 'premium' | 'pro' | 'standard';
}

export const FEATURED_SELLERS: Record<string, FeaturedSeller> = {
  PANEL_COMICS: {
    sellerId: '1b41eda0-651f-4db5-badd-580ece52bc58',
    displayName: 'Panel Comics',
    tier: 'premium'
  },
  
  KISS_KOMIXX: {
    sellerId: 'cc996c89-6380-4af3-8740-15f8b49957a4',
    displayName: 'Kiss Komixx',
    tier: 'premium'
  }
};

/**
 * Helper to get featured seller by key
 */
export function getFeaturedSeller(key: keyof typeof FEATURED_SELLERS): FeaturedSeller | undefined {
  return FEATURED_SELLERS[key];
}
