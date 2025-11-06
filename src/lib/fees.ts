// Marketplace fee calculation
// 8% + $0.30 per transaction

export const MARKETPLACE_FEE_RATE = 0.08;
export const MARKETPLACE_FEE_FIXED_CENTS = 30;

export interface FeeCalculation {
  fee_cents: number;
  payout_cents: number;
}

export function calculateMarketplaceFee(priceCents: number): FeeCalculation {
  const fee_cents = Math.round(priceCents * MARKETPLACE_FEE_RATE) + MARKETPLACE_FEE_FIXED_CENTS;
  const payout_cents = priceCents - fee_cents;
  
  return {
    fee_cents,
    payout_cents
  };
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
