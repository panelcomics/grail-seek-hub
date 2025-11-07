// Marketplace fee calculation - Grail Seeker v1.1
// Sales: 3.5% on total (item + shipping + tax)
// Trades: Tiered based on total trade value

export const MARKETPLACE_FEE_RATE = 0.035;
export const MARKETPLACE_FEE_FIXED_CENTS = 0;

// Trade fee tiers based on total trade value (item_a + item_b)
export const TRADE_FEE_TIERS = [
  { min: 0, max: 199.99, total: 0, each: 0 },
  { min: 200, max: 400, total: 4, each: 2 },
  { min: 401, max: 999, total: 8, each: 4 },
  { min: 1000, max: 1999, total: 20, each: 10 },
  { min: 2000, max: 3999, total: 25, each: 12.5 },
  { min: 4000, max: null, total: 35, each: 17.5 },
];

export interface FeeCalculation {
  fee_cents: number;
  payout_cents: number;
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
  const fee_cents = Math.round(priceCents * MARKETPLACE_FEE_RATE);
  const payout_cents = priceCents - fee_cents;
  
  return {
    fee_cents,
    payout_cents
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
