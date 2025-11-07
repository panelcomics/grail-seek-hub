// Marketplace fee calculation - Grail Seeker v1.1
// Sales: 3.5% on total (item + shipping + tax)
// Trades: Tiered based on total trade value

export const MARKETPLACE_FEE_RATE = 0.035;
export const MARKETPLACE_FEE_FIXED_CENTS = 0;

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
