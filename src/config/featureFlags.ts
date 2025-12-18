/**
 * FEATURE FLAGS
 * ==========================================================================
 * Central configuration for feature toggles.
 * Allows instant disable of features without code removal.
 * ==========================================================================
 */

export interface FeatureFlags {
  bulkScanEnabled: boolean;
  scannerAssistEnabled: boolean;
  analyticsEnabled: boolean;
}

// Default flags - can be overridden by admin settings in database
const DEFAULT_FLAGS: FeatureFlags = {
  bulkScanEnabled: true,
  scannerAssistEnabled: true,
  analyticsEnabled: true,
};

// In-memory cache for flags loaded from database
let cachedFlags: FeatureFlags | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Get all feature flags (with caching)
 */
export function getFeatureFlags(): FeatureFlags {
  // Return cached flags if still valid
  if (cachedFlags && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedFlags;
  }
  return DEFAULT_FLAGS;
}

/**
 * Get a single feature flag
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  return getFeatureFlags()[key];
}

/**
 * Update cached flags (called after fetching from database)
 */
export function updateCachedFlags(flags: Partial<FeatureFlags>): void {
  cachedFlags = { ...DEFAULT_FLAGS, ...flags };
  cacheTimestamp = Date.now();
}

/**
 * Clear flag cache (force refresh on next access)
 */
export function clearFlagCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}
