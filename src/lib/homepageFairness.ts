/**
 * Homepage Seller Fairness Algorithm
 * 
 * Purpose: Prevents a single seller from dominating the homepage listings.
 * This ensures multiple sellers get exposure in the top N slots.
 * 
 * Approach: Limit listings per seller in a sliding window, then interleave.
 * This is client-side only — does NOT change backend queries or data.
 */

import { Listing } from "@/types/listing";

interface FairnessOptions {
  /** Max listings per seller in the top window (default: 4) */
  maxPerSellerInTop?: number;
  /** Size of the top window to apply fairness (default: 50) */
  topWindowSize?: number;
}

/**
 * Applies fairness algorithm to homepage listings.
 * Ensures no single seller dominates the first page of results.
 * 
 * @param listings - Raw listings array from query
 * @param options - Configuration for fairness limits
 * @returns Reordered listings with seller diversity
 */
export function applyHomepageFairness(
  listings: Listing[],
  options: FairnessOptions = {}
): Listing[] {
  const { maxPerSellerInTop = 4, topWindowSize = 50 } = options;
  
  if (!listings || listings.length === 0) return [];
  
  // Track listings per seller
  const sellerCounts = new Map<string, number>();
  const fairListings: Listing[] = [];
  const deferredListings: Listing[] = [];
  
  // Process each listing
  for (const listing of listings) {
    // Get seller ID from the listing (could be from profiles or seller_id)
    const sellerId = getSellerId(listing);
    
    if (!sellerId) {
      // No seller ID = include anyway
      fairListings.push(listing);
      continue;
    }
    
    const currentCount = sellerCounts.get(sellerId) || 0;
    
    // If within top window and seller hasn't hit limit, include immediately
    if (fairListings.length < topWindowSize && currentCount < maxPerSellerInTop) {
      fairListings.push(listing);
      sellerCounts.set(sellerId, currentCount + 1);
    } else {
      // Defer to later in the list
      deferredListings.push(listing);
    }
  }
  
  // Append deferred listings after the fair window
  return [...fairListings, ...deferredListings];
}

/**
 * Extract seller ID from listing object
 * Uses user_id field which is the seller's ID
 */
function getSellerId(listing: Listing): string | null {
  // Primary: user_id on listing is the seller
  if (listing.user_id) {
    return listing.user_id;
  }
  
  // Fallback: try from profiles
  const profile = Array.isArray(listing.profiles) 
    ? listing.profiles[0] 
    : listing.profiles;
  
  if (profile?.user_id) {
    return profile.user_id;
  }
  
  return null;
}

/**
 * Interleave listings from different sellers for visual variety.
 * Use this for carousel displays where variety is important.
 */
export function interleaveBySellerForCarousel(
  listings: Listing[],
  maxConsecutive: number = 2
): Listing[] {
  if (!listings || listings.length <= 1) return listings;
  
  const result: Listing[] = [];
  const remaining = [...listings];
  let lastSellerId: string | null = null;
  let consecutiveCount = 0;
  
  while (remaining.length > 0) {
    // Find next listing that's not from the same seller (if possible)
    let selectedIndex = 0;
    
    if (consecutiveCount >= maxConsecutive) {
      // Try to find a different seller
      const differentSellerIndex = remaining.findIndex(
        (l) => getSellerId(l) !== lastSellerId
      );
      if (differentSellerIndex >= 0) {
        selectedIndex = differentSellerIndex;
      }
    }
    
    const selected = remaining[selectedIndex];
    remaining.splice(selectedIndex, 1);
    
    const currentSellerId = getSellerId(selected);
    if (currentSellerId === lastSellerId) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      lastSellerId = currentSellerId;
    }
    
    result.push(selected);
  }
  
  return result;
}
