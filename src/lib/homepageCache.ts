/**
 * Lightweight client-side cache for homepage listing carousels.
 * Mobile & desktop both use this helper so they always share the same
 * data + versioning rules:
 *  - We NEVER cache empty arrays from failed/timeout responses.
 *  - Any time we see fresh non-empty data we overwrite the previous cache.
 *  - On Supabase errors we prefer the last known non-empty data (memory or
 *    localStorage) instead of showing an empty homepage.
 *  *Increment CACHE_VERSION whenever cache semantics change* so old
 *  mobile Safari localStorage entries are force-cleared and cannot
 *  reintroduce this flaky "empty but not really" bug.
 */

import { homeDebugCacheHit, homeDebugCacheMiss, homeDebugNetworkSuccess, homeDebugNetworkError, homeDebugStaleData } from './homeDebug';

export type HomepageSectionKey =
  | 'featured-grails'
  | 'ending-soon'
  | 'local-deals'
  | 'newly-listed'
  | 'featured-shop-panel-comics'
  | 'featured-shop-kiss-komixx';

interface HomepageCacheEntry<T> {
  data: T;
  fetchedAt: number;
}

// 60-second TTL (configurable)
const HOMEPAGE_CACHE_TTL_MS = 60_000;

// Cache version - increment to invalidate all old localStorage caches
// Updated: 2025-11-29 to fix desktop not showing newly added listings
const CACHE_VERSION = 3;

// In-memory cache
const homepageCache: Record<string, HomepageCacheEntry<any>> = {};

// Clear outdated localStorage on first access
let hasCheckedCacheVersion = false;
function ensureCacheVersion() {
  if (hasCheckedCacheVersion || typeof window === 'undefined') return;
  hasCheckedCacheVersion = true;
  
  try {
    const storedVersion = localStorage.getItem('grailseeker:cache-version');
    const currentVersion = String(CACHE_VERSION);
    
    if (storedVersion !== currentVersion) {
      console.log(`[HOMEPAGE_CACHE] Version mismatch (stored=${storedVersion}, current=${currentVersion}), clearing all cached data`);
      
      // Clear all homepage cache entries
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('grailseeker:homepage:')) {
          localStorage.removeItem(key);
          console.log(`[HOMEPAGE_CACHE] Cleared stale cache: ${key}`);
        }
      });
      
      // Update version marker
      localStorage.setItem('grailseeker:cache-version', currentVersion);
    }
  } catch (e) {
    console.warn('[HOMEPAGE_CACHE] Could not check cache version:', e);
  }
}

/**
 * Generic homepage cache wrapper
 * - Returns cached data if fresh (< 60s old)
 * - Falls back to network fetch
 * - Returns stale data on error if available
 * - Handles SSR gracefully
 */
export async function getHomepageCached<T>(
  key: HomepageSectionKey,
  fetcher: () => Promise<T>
): Promise<{ data: T; fromCache: boolean }> {
  // Skip cache in SSR
  if (typeof window === 'undefined') {
    const data = await fetcher();
    return { data, fromCache: false };
  }
  
  // Ensure cache version is current (clears stale mobile data)
  ensureCacheVersion();

  const now = Date.now();
  const cached = homepageCache[key];

  // Return fresh cached data ONLY if it contains items
  // Never return cached empty arrays - always revalidate
  if (cached && (now - cached.fetchedAt) < HOMEPAGE_CACHE_TTL_MS) {
    const itemCount = Array.isArray(cached.data) ? cached.data.length : '?';

    if (Array.isArray(cached.data) && cached.data.length > 0) {
      const age = now - cached.fetchedAt;
      const viewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
      console.log(`[HOMEPAGE_CACHE] ${key} → cache hit (${itemCount} items, age=${age}ms, viewport=${viewport})`);
      homeDebugCacheHit(key, { count: itemCount, age });
      return { data: cached.data as T, fromCache: true };
    } else {
      console.log(`[HOMEPAGE_CACHE] ${key} → cache has empty data, revalidating`);
    }
  }

  // Fetch from network
  try {
    const viewport = typeof window !== 'undefined' ? `${window.innerWidth}px` : 'SSR';
    console.log(`[HOMEPAGE_CACHE] ${key} → network fetch (viewport: ${viewport})`);
    homeDebugCacheMiss(key);
    const data = await fetcher();

    const itemCount = Array.isArray(data) ? data.length : '?';
    console.log(`[HOMEPAGE_CACHE] ${key} → network returned ${itemCount} items (viewport: ${viewport})`);
    
    // CRITICAL FIX: Only cache non-empty results to prevent poisoned cache
    // Empty arrays from timeouts/errors should not be cached
    if (Array.isArray(data) && data.length > 0) {
      // Store in cache
      homepageCache[key] = {
        data,
        fetchedAt: now,
      };

      // Optional: mirror to localStorage for persistence across page loads
      try {
        localStorage.setItem(
          `grailseeker:homepage:${key}`,
          JSON.stringify({ data, fetchedAt: now })
        );
      } catch (e) {
        // Ignore localStorage errors (quota, privacy mode, etc.)
      }
      
      console.log(`[HOMEPAGE_CACHE] ${key} → cached ${itemCount} items (viewport: ${window.innerWidth}px)`);
    } else {
      console.log(`[HOMEPAGE_CACHE] ${key} → not caching empty result (${itemCount} items, viewport: ${window.innerWidth}px)`);
    }
    
    homeDebugNetworkSuccess(key, { count: itemCount });
    
    return { data, fromCache: false };
  } catch (error) {
    console.error(`[HOMEPAGE_CACHE] ${key} → fetch error:`, error);
    homeDebugNetworkError(key, error);

    // If we have stale cache WITH DATA, return it rather than failing
    if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
      const age = now - cached.fetchedAt;
      const itemCount = cached.data.length;
      console.log(`[HOMEPAGE_CACHE] ${key} → returning stale cache (${itemCount} items, age=${age}ms)`);
      homeDebugStaleData(key, { count: itemCount, age });
      return { data: cached.data as T, fromCache: true };
    }

    // Try localStorage as last resort (but only if it has data)
    try {
      const stored = localStorage.getItem(`grailseeker:homepage:${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.data) && parsed.data.length > 0) {
          const age = now - parsed.fetchedAt;
          const itemCount = parsed.data.length;
          console.log(`[HOMEPAGE_CACHE] ${key} → returning localStorage backup (${itemCount} items, age=${age}ms)`);
          return { data: parsed.data as T, fromCache: true };
        }
      }
    } catch (e) {
      // Ignore parse errors
    }

    // No cache available, rethrow so UI can show error state
    throw error;
  }
}
