/**
 * Client-side cache for ComicVine search results
 * Prevents unnecessary API calls for repeated searches
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry<any>>();

/**
 * Generate cache key from search parameters
 */
export function generateCacheKey(params: {
  query: string;
  publisher?: string;
  issueNumber?: string;
  offset?: number;
  limit?: number;
}): string {
  const normalized = params.query.toLowerCase().trim();
  const parts = [normalized];
  
  if (params.publisher) parts.push(`pub:${params.publisher.toLowerCase()}`);
  if (params.issueNumber) parts.push(`issue:${params.issueNumber}`);
  if (params.offset) parts.push(`offset:${params.offset}`);
  if (params.limit) parts.push(`limit:${params.limit}`);
  
  return parts.join('|');
}

/**
 * Get cached data if available and not expired
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  const age = now - entry.timestamp;
  
  if (age > CACHE_TTL_MS) {
    cache.delete(key);
    console.log('[COMICVINE-CACHE] Expired:', key);
    return null;
  }
  
  console.log('[COMICVINE-CACHE] Hit:', key, `(age: ${Math.round(age / 1000)}s)`);
  return entry.data;
}

/**
 * Store data in cache
 * Only caches non-empty results
 */
export function setCache<T>(key: string, data: T): void {
  // Never cache empty results or errors
  if (Array.isArray(data) && data.length === 0) {
    console.log('[COMICVINE-CACHE] Skipping empty result:', key);
    return;
  }
  
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    console.log('[COMICVINE-CACHE] Skipping invalid data:', key);
    return;
  }
  
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  
  console.log('[COMICVINE-CACHE] Stored:', key);
}

/**
 * Clear entire cache (for testing or manual refresh)
 */
export function clearCache(): void {
  cache.clear();
  console.log('[COMICVINE-CACHE] Cleared all entries');
}

/**
 * Clear expired entries (automatic cleanup)
 */
export function cleanupExpired(): void {
  const now = Date.now();
  let removed = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cache.delete(key);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[COMICVINE-CACHE] Cleaned up ${removed} expired entries`);
  }
}

// Auto-cleanup every 2 minutes
setInterval(cleanupExpired, 2 * 60 * 1000);
