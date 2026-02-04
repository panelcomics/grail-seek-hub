/**
 * Marketplace Rails Feature Flag Hook
 * 
 * Provides easy access to the marketplace rails feature flags
 * with proper typing and consistent behavior.
 * 
 * Now uses database-driven flags from baselane_feature_flags table.
 */

import { useBaselaneFlags } from "@/hooks/useBaselaneFlags";

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
  const { isEnabled, loading } = useBaselaneFlags();
  
  // Individual feature checks
  const walletEnabled = isEnabled("ENABLE_SELLER_WALLET");
  const earningsEnabled = isEnabled("ENABLE_EARNINGS_DASHBOARD");
  const timelineEnabled = isEnabled("ENABLE_ORDER_TIMELINE");
  const riskEnabled = isEnabled("ENABLE_RISK_HOLDS");
  const notificationsEnabled = isEnabled("ENABLE_NOTIFICATIONS");
  const tax1099Enabled = isEnabled("ENABLE_TAX_1099");
  
  // Any feature enabled = show Financial Tools section
  const anyEnabled = walletEnabled || earningsEnabled || timelineEnabled || riskEnabled || tax1099Enabled;
  
  return {
    loading,
    isEnabled: anyEnabled,
    // Individual feature checks
    shouldShowWallet: walletEnabled,
    shouldShowEarnings: earningsEnabled,
    shouldShowTimeline: timelineEnabled,
    shouldShowRiskHolds: riskEnabled,
    shouldShowNotifications: notificationsEnabled,
    shouldShowTax1099: tax1099Enabled,
    shouldLogEvents: timelineEnabled || riskEnabled,
  };
}
