/**
 * CENTRAL FEE CONFIGURATION
 * ==========================================================================
 * This is the SINGLE SOURCE OF TRUTH for all platform fees.
 * 
 * CRITICAL: When changing these values:
 * 1. Update both frontend AND backend (edge functions must use matching values)
 * 2. Test thoroughly before deploying
 * 3. Deploy frontend and edge functions together
 * 
 * The frontend uses these values for DISPLAY/ESTIMATES only.
 * The backend (edge functions) uses matching constants for ACTUAL charges.
 * ==========================================================================
 */

// ==========================================================================
// MARKETPLACE FEES (Buy/Sell)
// ==========================================================================

/**
 * Standard marketplace fee rate for regular sellers
 * This is the total fee charged to the seller (includes platform + payment processing)
 * Example: 0.0375 = 3.75% total fee
 */
export const STANDARD_SELLER_FEE_RATE = 0.0375;

/**
 * Founding seller fee rate (first 100 sellers)
 * Lower rate as a lifetime benefit for early adopters
 * Example: 0.02 = 2% total fee
 */
export const FOUNDING_SELLER_FEE_RATE = 0.02;

/**
 * Current intro rate for marketplace (temporary promotional rate)
 * This is the current default rate shown to new sellers
 * Example: 0.065 = 6.5% total fee (includes payment processing)
 */
export const INTRO_SELLER_FEE_RATE = 0.065;

/**
 * Buyer protection fee (flat fee charged to buyers)
 * Covers refund protection and dispute resolution
 */
export const BUYER_PROTECTION_FEE = 1.99;

// ==========================================================================
// STRIPE PAYMENT PROCESSING FEES
// ==========================================================================

/**
 * Stripe percentage fee (standard card processing)
 * This is Stripe's cut, not ours
 */
export const STRIPE_PERCENTAGE_FEE = 0.029;

/**
 * Stripe fixed fee per transaction (in cents)
 * This is Stripe's cut, not ours
 */
export const STRIPE_FIXED_FEE_CENTS = 30;

// ==========================================================================
// LOCAL PICKUP
// ==========================================================================

/**
 * Fee rate for local pickup transactions
 * Set to 0 to incentivize local commerce
 */
export const LOCAL_PICKUP_FEE_RATE = 0;

// ==========================================================================
// TRADE FEES (unchanged)
// ==========================================================================

/**
 * Trade fee tiers based on total trade value (item_a + item_b)
 * Each tier specifies min/max value range, total fee, and per-user fee
 */
export const TRADE_FEE_TIERS = [
  { min: 0, max: 50, total: 2, each: 1 },
  { min: 51, max: 100, total: 5, each: 2.5 },
  { min: 101, max: 250, total: 12, each: 6 },
  { min: 251, max: 500, total: 22, each: 11 },
  { min: 501, max: 1000, total: 35, each: 17.5 },
  { min: 1001, max: 2000, total: 45, each: 22.5 },
  { min: 2001, max: 4000, total: 55, each: 27.5 },
  { min: 4001, max: 5000, total: 60, each: 30 },
  { min: 5001, max: 10000, total: 200, each: 100 },
  { min: 10001, max: null, total: 200, each: 100 },
];

// ==========================================================================
// DERIVED CONSTANTS (DO NOT EDIT - calculated automatically)
// ==========================================================================

/**
 * Display text for fees (used in UI)
 */
export const FEE_DISPLAY_TEXT = {
  INTRO_RATE: `${(INTRO_SELLER_FEE_RATE * 100).toFixed(1)}%`,
  FOUNDING_RATE: `${(FOUNDING_SELLER_FEE_RATE * 100).toFixed(1)}%`,
  STANDARD_RATE: `${(STANDARD_SELLER_FEE_RATE * 100).toFixed(2)}%`,
  STRIPE_RATE: `${(STRIPE_PERCENTAGE_FEE * 100).toFixed(1)}% + $${(STRIPE_FIXED_FEE_CENTS / 100).toFixed(2)}`,
};

/**
 * Notes for developers:
 * 
 * - INTRO_SELLER_FEE_RATE (6.5%) is the current default for all new marketplace listings
 * - FOUNDING_SELLER_FEE_RATE (2%) applies only to the first 100 sellers (lifetime benefit)
 * - STANDARD_SELLER_FEE_RATE (3.75%) is the eventual standard rate (not currently used)
 * - Edge functions MUST use these same constants (copy them into function files)
 * - Frontend imports these for display; backend uses copies for actual charges
 * - Stripe fees are separate and come out of the total seller fee
 */
