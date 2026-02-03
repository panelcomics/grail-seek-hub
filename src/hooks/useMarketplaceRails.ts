/**
 * Marketplace Rails Feature Flag Hook
 * 
 * Provides easy access to the marketplace rails feature flag
 * with proper typing and consistent behavior.
 */

import { getFeatureFlag } from "@/config/featureFlags";

/**
 * Check if marketplace rails features are enabled
 * 
 * When this returns false:
 * - All marketplace rails routes should redirect
 * - All marketplace rails UI components should not render
 * - No marketplace rails data should be fetched
 * 
 * When this returns true:
 * - Wallet, Earnings, Timeline features are available
 * - Risk assessments are computed (non-blocking)
 * - Order status events are logged
 */
export function useMarketplaceRails() {
  const isEnabled = getFeatureFlag("marketplaceRailsEnabled");
  
  return {
    isEnabled,
    // Convenience methods for common checks
    shouldShowWallet: isEnabled,
    shouldShowEarnings: isEnabled,
    shouldShowTimeline: isEnabled,
    shouldLogEvents: isEnabled,
  };
}
