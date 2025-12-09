/**
 * SUBSCRIPTION CONFIGURATION
 * ==========================================================================
 * Configuration for the GrailSeeker subscription tiers.
 * 
 * IMPORTANT: This is SEPARATE from marketplace fees and trade logic.
 * Subscriptions control access to "pro" features only - they do NOT
 * change platform fees or trade eligibility requirements.
 * ==========================================================================
 */

// ==========================================================================
// TIER DEFINITIONS
// ==========================================================================

export type SubscriptionTier = 'free' | 'elite';

export const SUBSCRIPTION_TIERS = {
  FREE: 'free' as const,
  ELITE: 'elite' as const,
};

// ==========================================================================
// STRIPE PRICE IDS
// ==========================================================================

/**
 * Elite tier monthly subscription price ID from Stripe
 * Created via Stripe dashboard or API
 */
export const ELITE_MONTHLY_PRICE_ID = 'price_1ScZb48ehQu3cclJSOj1QJL2';

/**
 * Elite tier product ID from Stripe
 */
export const ELITE_PRODUCT_ID = 'prod_TZj3y1mPRINSip';

// ==========================================================================
// FEATURE LIMITS BY TIER
// ==========================================================================

export const TIER_LIMITS = {
  free: {
    savedSearches: 5,
    watchlistItems: 50,
    // Future limits can be added here
  },
  elite: {
    savedSearches: -1, // -1 = unlimited
    watchlistItems: 500,
    // Future limits can be added here
  },
} as const;

// ==========================================================================
// TIER DISPLAY INFO
// ==========================================================================

export const TIER_INFO = {
  free: {
    name: 'Free',
    description: 'Basic access to GrailSeeker marketplace',
    price: 0,
    priceDisplay: 'Free',
    features: [
      'List & sell comics',
      'AI-assisted listing (basic)',
      'Basic print/variant detection',
      'Key issue identification',
      `Up to ${TIER_LIMITS.free.watchlistItems} watchlist items`,
      `Up to ${TIER_LIMITS.free.savedSearches} saved searches`,
      'Access to trading (once requirements met)',
    ],
  },
  elite: {
    name: 'Elite',
    description: 'Premium features for serious collectors',
    price: 9.99,
    priceDisplay: '$9.99/mo',
    features: [
      'Everything in Free, plus:',
      'Priority access to Deal Finder tool',
      'Unlimited saved searches',
      `Up to ${TIER_LIMITS.elite.watchlistItems} watchlist items`,
      'Early access to advanced AI tools',
      'Portfolio tools (coming soon)',
      '"Elite" badge on profile',
    ],
  },
} as const;

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Check if a tier has a specific limit or is unlimited
 */
export function getTierLimit(tier: SubscriptionTier, limitKey: keyof typeof TIER_LIMITS.free): number {
  return TIER_LIMITS[tier][limitKey];
}

/**
 * Check if user has reached their tier limit
 */
export function hasReachedLimit(
  tier: SubscriptionTier,
  limitKey: keyof typeof TIER_LIMITS.free,
  currentCount: number
): boolean {
  const limit = getTierLimit(tier, limitKey);
  if (limit === -1) return false; // Unlimited
  return currentCount >= limit;
}
