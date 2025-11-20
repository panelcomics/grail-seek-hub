// Marketplace fee calculation - Grail Seeker v2.0
// Sales: Flat 6.5% MAX total fee (includes Stripe processing)
// GrailSeeker absorbs Stripe fees out of that 6.5%, leaving ~3-3.5% net
// Trades: Tiered based on total trade value (unchanged)

export const MARKETPLACE_FEE_RATE = 0.065;
export const STRIPE_RATE = 0.029;
export const STRIPE_FIXED_CENTS = 30;

// Trade fee tiers based on total trade value (item_a + item_b)
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

export interface FeeCalculation {
  fee_cents: number;
  payout_cents: number;
  platform_fee_cents?: number;
}

export interface TradeFeeCalculation {
  total_fee: number;
  each_user_fee: number;
  tier_info: string;
}

export function calculateTradeFee(totalTradeValue: number): TradeFeeCalculation {
  const tier = TRADE_FEE_TIERS.find(
    t => totalTradeValue >= t.min && (t.max === null || totalTradeValue <= t.max)
  );

  if (!tier) {
    // Default to highest tier if not found
    const highestTier = TRADE_FEE_TIERS[TRADE_FEE_TIERS.length - 1];
    return {
      total_fee: highestTier.total,
      each_user_fee: highestTier.each,
      tier_info: `$${highestTier.min}+`
    };
  }

  return {
    total_fee: tier.total,
    each_user_fee: tier.each,
    tier_info: tier.max 
      ? `$${tier.min}-$${tier.max}` 
      : `$${tier.min}+`
  };
}

export function calculateMarketplaceFee(priceCents: number): FeeCalculation {
  // Calculate max total fee (6.5% cap)
  const max_total_fee_cents = Math.round(priceCents * MARKETPLACE_FEE_RATE);
  
  // Estimate Stripe fees (2.9% + $0.30)
  const estimated_stripe_fee_cents = Math.round(priceCents * STRIPE_RATE) + STRIPE_FIXED_CENTS;
  
  // Platform fee is what's left after Stripe takes their cut
  const platform_fee_cents = Math.max(0, max_total_fee_cents - estimated_stripe_fee_cents);
  
  // Total fee charged to seller (for display purposes)
  const fee_cents = max_total_fee_cents;
  const payout_cents = priceCents - fee_cents;
  
  return {
    fee_cents,
    payout_cents,
    platform_fee_cents
  };
}

export interface FeeCalculationWithPlatform extends FeeCalculation {
  platform_fee_cents?: number;
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Calculate marketplace fee with custom rate support
 * Uses seller's custom_fee_rate if set, otherwise uses default 6.5%
 * 
 * @param priceCents - Price in cents
 * @param customFeeRate - Optional custom fee rate (e.g., 0.02 for 2%)
 */
export function calculateMarketplaceFeeWithCustomRate(
  priceCents: number,
  customFeeRate?: number | null
): FeeCalculation {
  // Premium dealers (custom_fee_rate = 0) only pay Stripe fees
  if (customFeeRate === 0) {
    const stripe_fee_cents = Math.round(priceCents * STRIPE_RATE) + STRIPE_FIXED_CENTS;
    return {
      fee_cents: stripe_fee_cents,
      payout_cents: priceCents - stripe_fee_cents,
      platform_fee_cents: 0
    };
  }

  const feeRate = customFeeRate !== null && customFeeRate !== undefined 
    ? customFeeRate 
    : MARKETPLACE_FEE_RATE;
  
  // Calculate total fee using custom or default rate
  const max_total_fee_cents = Math.round(priceCents * feeRate);
  
  // Estimate Stripe fees (2.9% + $0.30)
  const estimated_stripe_fee_cents = Math.round(priceCents * STRIPE_RATE) + STRIPE_FIXED_CENTS;
  
  // Platform fee is what's left after Stripe takes their cut
  const platform_fee_cents = Math.max(0, max_total_fee_cents - estimated_stripe_fee_cents);
  
  // Total fee charged to seller
  const fee_cents = max_total_fee_cents;
  const payout_cents = priceCents - fee_cents;
  
  return {
    fee_cents,
    payout_cents,
    platform_fee_cents
  };
}

/**
 * Format fee rate as percentage string
 */
export function formatFeeRate(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}
