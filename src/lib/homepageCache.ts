/**
 * Lightweight client-side cache for homepage listing carousels
 * Reduces flicker on refresh and improves perceived performance
 */

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

  // Return fresh cached data
  if (cached && (now - cached.fetchedAt) < HOMEPAGE_CACHE_TTL_MS) {
    const age = now - cached.fetchedAt;
    const itemCount = Array.isArray(cached.data) ? cached.data.length : '?';
    console.log(`[HOMEPAGE_CACHE] ${key} → cache hit (${itemCount} items, age=${age}ms)`);
    return { data: cached.data, fromCache: true };
  }

  // Fetch from network
  try {
    console.log(`[HOMEPAGE_CACHE] ${key} → network fetch`);
    const data = await fetcher();
    
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

    const itemCount = Array.isArray(data) ? data.length : '?';
    console.log(`[HOMEPAGE_CACHE] ${key} → cached ${itemCount} items`);
    
    return { data, fromCache: false };
  } catch (error) {
    console.error(`[HOMEPAGE_CACHE] ${key} → fetch error:`, error);

    // If we have stale cache, return it rather than failing
    if (cached) {
      const age = now - cached.fetchedAt;
      const itemCount = Array.isArray(cached.data) ? cached.data.length : '?';
      console.log(`[HOMEPAGE_CACHE] ${key} → returning stale cache (${itemCount} items, age=${age}ms)`);
      return { data: cached.data, fromCache: true };
    }

    // Try localStorage as last resort
    try {
      const stored = localStorage.getItem(`grailseeker:homepage:${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const age = now - parsed.fetchedAt;
        const itemCount = Array.isArray(parsed.data) ? parsed.data.length : '?';
        console.log(`[HOMEPAGE_CACHE] ${key} → returning localStorage backup (${itemCount} items, age=${age}ms)`);
        return { data: parsed.data, fromCache: true };
      }
    } catch (e) {
      // Ignore parse errors
    }

    // No cache available, rethrow so UI can show error state
    throw error;
  }
}
