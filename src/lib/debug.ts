// Production-safe debug logging
// Set VITE_DEBUG=true in .env to enable console logs

const DEBUG = import.meta.env.VITE_DEBUG === 'true';

export function debugLog(prefix: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`[${prefix}]`, ...args);
  }
}

export function debugError(prefix: string, ...args: any[]) {
  if (DEBUG) {
    console.error(`[${prefix}]`, ...args);
  }
}

export function debugWarn(prefix: string, ...args: any[]) {
  if (DEBUG) {
    console.warn(`[${prefix}]`, ...args);
  }
}
