/**
 * Unified debug logging for homepage carousel lifecycle
 * Enable by setting VITE_DEBUG=true in .env (production safe)
 */

const DEBUG = import.meta.env.VITE_DEBUG === 'true';

export function homeDebug(event: string, data?: unknown) {
  if (!DEBUG) return;

  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const payload = data !== undefined ? data : '';
  console.log(`[HOME-DEBUG] ${timestamp} — ${event}`, payload);
}

export function homeDebugStart(carouselId: string) {
  homeDebug(`${carouselId}:fetch-start`);
}

export function homeDebugCacheHit(carouselId: string, data: unknown) {
  homeDebug(`${carouselId}:cache-hit`, data);
}

export function homeDebugCacheMiss(carouselId: string) {
  homeDebug(`${carouselId}:cache-miss`);
}

export function homeDebugNetworkSuccess(carouselId: string, data: unknown) {
  homeDebug(`${carouselId}:network-success`, data);
}

export function homeDebugNetworkError(carouselId: string, error: unknown) {
  homeDebug(`${carouselId}:network-error`, error);
}

export function homeDebugRender(carouselId: string, data: unknown) {
  homeDebug(`${carouselId}:render`, data);
}

export function homeDebugStaleData(carouselId: string, data: unknown) {
  homeDebug(`${carouselId}:stale-data-fallback`, data);
}
