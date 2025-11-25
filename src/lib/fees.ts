/**
 * LEGACY FEE UTILITIES
 * ============================================================================
 * This file contains fee calculation utilities and types.
 * For fee CONSTANTS, import from src/config/feesConfig.ts
 * ============================================================================
 */

import {
  STANDARD_SELLER_FEE_RATE,
  FOUNDING_SELLER_FEE_RATE,
  STRIPE_PERCENTAGE_FEE,
  STRIPE_FIXED_FEE_CENTS,
  TRADE_FEE_TIERS,
} from "@/config/feesConfig";

// Re-export for backwards compatibility (DEPRECATED - import from feesConfig instead)
export const MARKETPLACE_FEE_RATE = STANDARD_SELLER_FEE_RATE;
export const STRIPE_RATE = STRIPE_PERCENTAGE_FEE;
export const STRIPE_FIXED_CENTS = STRIPE_FIXED_FEE_CENTS;
export { FOUNDING_SELLER_FEE_RATE, TRADE_FEE_TIERS };

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
