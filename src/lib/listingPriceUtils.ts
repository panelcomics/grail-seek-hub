/**
 * Resolve the display price for a listing using priority-based field selection.
 * Returns the price in dollars (not cents), or null if no price is available.
 * 
 * Priority order:
 * 1. price_cents (convert to dollars)
 * 2. listed_price (from inventory_items, already in dollars)
 * 3. price
 * 4. current_price
 * 5. bin_price
 * 6. starting_bid or start_bid
 * 7. Fall back to null
 */
export function resolvePrice(listing: any): number | null {
  // Priority 1: price_cents
  if (listing.price_cents !== null && listing.price_cents !== undefined) {
    return listing.price_cents / 100;
  }
  
  // Priority 2: listed_price (from inventory_items)
  if (listing.listed_price !== null && listing.listed_price !== undefined && listing.listed_price > 0) {
    return listing.listed_price;
  }
  
  // Priority 3: price
  if (listing.price !== null && listing.price !== undefined) {
    return listing.price;
  }
  
  // Priority 4: current_price
  if (listing.current_price !== null && listing.current_price !== undefined) {
    return listing.current_price;
  }
  
  // Priority 5: bin_price
  if (listing.bin_price !== null && listing.bin_price !== undefined) {
    return listing.bin_price;
  }
  
  // Priority 6: starting_bid or start_bid
  if (listing.starting_bid !== null && listing.starting_bid !== undefined) {
    return listing.starting_bid;
  }
  if (listing.start_bid !== null && listing.start_bid !== undefined) {
    return listing.start_bid;
  }
  
  // Fallback to inventory_items prices (for display only)
  if (listing.inventory_items?.listed_price && listing.inventory_items.listed_price > 0) {
    return listing.inventory_items.listed_price;
  }
  
  if (listing.inventory_items?.pricing_mid && listing.inventory_items.pricing_mid > 0) {
    return listing.inventory_items.pricing_mid;
  }
  
  // Final fallback
  return null;
}

/**
 * Resolve price in cents for backend operations.
 * Returns the price in cents, or null if no price is available.
 */
export function resolvePriceCents(listing: any): number | null {
  // If price_cents exists, use it directly
  if (listing.price_cents !== null && listing.price_cents !== undefined) {
    return listing.price_cents;
  }
  
  // Otherwise resolve price in dollars and convert to cents
  const priceInDollars = resolvePrice(listing);
  if (priceInDollars === null) {
    return null;
  }
  return Math.round(priceInDollars * 100);
}
