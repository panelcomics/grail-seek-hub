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
 * Safe: never throws even if localStorage fails
 */
export function getCached<T>(key: string): T | null {
  try {
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age > CACHE_TTL_MS) {
      cache.delete(key);
      if (import.meta.env.VITE_SCANNER_DEBUG === 'true') {
        console.log('[COMICVINE-CACHE] Expired:', key);
      }
      return null;
    }
    
    if (import.meta.env.VITE_SCANNER_DEBUG === 'true') {
      console.log('[COMICVINE-CACHE] Hit:', key, `(age: ${Math.round(age / 1000)}s)`);
    }
    return entry.data;
  } catch (error) {
    console.warn('[COMICVINE-CACHE] getCached failed:', error);
    return null;
  }
}

/**
 * Store data in cache
 * Only caches non-empty results
 * Safe: never throws even if localStorage fails
 */
export function setCache<T>(key: string, data: T): void {
  try {
    // Never cache empty results or errors
    if (Array.isArray(data) && data.length === 0) {
      if (import.meta.env.VITE_SCANNER_DEBUG === 'true') {
        console.log('[COMICVINE-CACHE] Skipping empty result:', key);
      }
      return;
    }
    
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      if (import.meta.env.VITE_SCANNER_DEBUG === 'true') {
        console.log('[COMICVINE-CACHE] Skipping invalid data:', key);
      }
      return;
    }
    
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    if (import.meta.env.VITE_SCANNER_DEBUG === 'true') {
      console.log('[COMICVINE-CACHE] Stored:', key);
    }
  } catch (error) {
    console.warn('[COMICVINE-CACHE] setCache failed:', error);
  }
}

/**
 * Clear entire cache (for testing or manual refresh)
 * Safe: never throws
 */
export function clearCache(): void {
  try {
    cache.clear();
    if (import.meta.env.VITE_SCANNER_DEBUG === 'true') {
      console.log('[COMICVINE-CACHE] Cleared all entries');
    }
  } catch (error) {
    console.warn('[COMICVINE-CACHE] clearCache failed:', error);
  }
}

/**
 * Clear expired entries (automatic cleanup)
 * Safe: never throws
 */
export function cleanupExpired(): void {
  try {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0 && import.meta.env.VITE_SCANNER_DEBUG === 'true') {
      console.log(`[COMICVINE-CACHE] Cleaned up ${removed} expired entries`);
    }
  } catch (error) {
    console.warn('[COMICVINE-CACHE] cleanupExpired failed:', error);
  }
}

// Auto-cleanup every 2 minutes
setInterval(cleanupExpired, 2 * 60 * 1000);
