/**
 * Lightweight client-side cache for homepage listing carousels
 * Reduces flicker on refresh and improves perceived performance
 */

import { homeDebugCacheHit, homeDebugCacheMiss, homeDebugNetworkSuccess, homeDebugNetworkError, homeDebugStaleData } from './homeDebug';

export type HomepageSectionKey =
  | 'featured-grails'
  | 'ending-soon'
  | 'local-deals'
  | 'newly-listed'
  | 'featured-shop-panel-comics';

interface HomepageCacheEntry<T> {
  data: T;
  fetchedAt: number;
}

// 60-second TTL (configurable)
const HOMEPAGE_CACHE_TTL_MS = 60_000;

// In-memory cache
const homepageCache: Record<string, HomepageCacheEntry<any>> = {};

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

  const now = Date.now();
  const cached = homepageCache[key];

  // Return fresh cached data ONLY if it contains items
  // Never return cached empty arrays - always revalidate
  if (cached && (now - cached.fetchedAt) < HOMEPAGE_CACHE_TTL_MS) {
    const itemCount = Array.isArray(cached.data) ? cached.data.length : '?';
    
    // If cached data is non-empty, use it
    if (Array.isArray(cached.data) && cached.data.length > 0) {
      const age = now - cached.fetchedAt;
      console.log(`[HOMEPAGE_CACHE] ${key} → cache hit (${itemCount} items, age=${age}ms)`);
      homeDebugCacheHit(key, { count: itemCount, age });
      return { data: cached.data as T, fromCache: true };
    } else {
      // Cached data is empty - treat as cache miss and refetch
      console.log(`[HOMEPAGE_CACHE] ${key} → cache has empty data, revalidating`);
    }
  }

  // Fetch from network
  try {
    console.log(`[HOMEPAGE_CACHE] ${key} → network fetch`);
    homeDebugCacheMiss(key);
    const data = await fetcher();
    
    const itemCount = Array.isArray(data) ? data.length : '?';
    
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
      
      console.log(`[HOMEPAGE_CACHE] ${key} → cached ${itemCount} items`);
    } else {
      console.log(`[HOMEPAGE_CACHE] ${key} → not caching empty result (${itemCount} items)`);
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
