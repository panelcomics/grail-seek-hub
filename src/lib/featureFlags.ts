/**
 * Feature flags for scanner and listing features
 * These are managed server-side through Lovable Cloud Secrets
 * Client components check these for UI behavior, but server enforces them
 */

export interface FeatureFlags {
  SCANNER_CACHE: boolean;
  SCANNER_ANALYTICS: boolean;
  GCD_FALLBACK: boolean;
  EBAY_COMPS: boolean;
  TOP3_PICKS: boolean;
  IMAGE_COMPRESSION: boolean;
  REPRINT_FILTER: boolean;
  PRICING_PIPELINE: boolean;
  MANUAL_OVERRIDE: boolean;
  PICK_AUTOFILL: boolean;
}

/**
 * Default feature flag values (all enabled by default)
 * Actual values are enforced server-side via Lovable Cloud Secrets
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  SCANNER_CACHE: true,
  SCANNER_ANALYTICS: true,
  GCD_FALLBACK: true,
  EBAY_COMPS: true,
  TOP3_PICKS: true,
  IMAGE_COMPRESSION: true,
  REPRINT_FILTER: true,
  PRICING_PIPELINE: true,
  MANUAL_OVERRIDE: true,
  PICK_AUTOFILL: true,
};

/**
 * Get feature flags for the current session
 * Note: Client-side checks are for UI only - server always enforces
 */
export function getFeatureFlags(): FeatureFlags {
  // In production, these would be fetched from server
  // For now, return defaults (server will enforce actual values)
  return DEFAULT_FEATURE_FLAGS;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}
