/**
 * Resolve the display price for a listing using priority-based field selection.
 * Returns the price in dollars (not cents).
 * 
 * Priority order:
 * 1. price_cents (convert to dollars)
 * 2. price
 * 3. current_price
 * 4. bin_price
 * 5. starting_bid
 * 6. Fall back to 0
 */
export function resolvePrice(listing: any): number {
  // Priority 1: price_cents
  if (listing.price_cents !== null && listing.price_cents !== undefined) {
    return listing.price_cents / 100;
  }
  
  // Priority 2: price
  if (listing.price !== null && listing.price !== undefined) {
    return listing.price;
  }
  
  // Priority 3: current_price
  if (listing.current_price !== null && listing.current_price !== undefined) {
    return listing.current_price;
  }
  
  // Priority 4: bin_price
  if (listing.bin_price !== null && listing.bin_price !== undefined) {
    return listing.bin_price;
  }
  
  // Priority 5: starting_bid
  if (listing.starting_bid !== null && listing.starting_bid !== undefined) {
    return listing.starting_bid;
  }
  
  // Fallback to inventory_items prices (for display only)
  if (listing.inventory_items?.listed_price && listing.inventory_items.listed_price > 0) {
    return listing.inventory_items.listed_price;
  }
  
  if (listing.inventory_items?.pricing_mid && listing.inventory_items.pricing_mid > 0) {
    return listing.inventory_items.pricing_mid;
  }
  
  // Final fallback
  return 0;
}

/**
 * Resolve price in cents for backend operations.
 * Returns the price in cents.
 */
export function resolvePriceCents(listing: any): number {
  // If price_cents exists, use it directly
  if (listing.price_cents !== null && listing.price_cents !== undefined) {
    return listing.price_cents;
  }
  
  // Otherwise resolve price in dollars and convert to cents
  const priceInDollars = resolvePrice(listing);
  return Math.round(priceInDollars * 100);
}
