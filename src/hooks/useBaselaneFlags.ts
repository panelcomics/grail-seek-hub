/**
 * BASELANE FEATURE FLAGS HOOK
 * ==========================================================================
 * React hook for accessing Baselane Pack v1 feature flags from database.
 * Reads from baselane_feature_flags table with caching and real-time updates.
 * ==========================================================================
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BaselaneFlags {
  ENABLE_BASELANE_PACK_V1: boolean;
  ENABLE_ORDER_TIMELINE: boolean;
  ENABLE_SELLER_WALLET: boolean;
  ENABLE_EARNINGS_DASHBOARD: boolean;
  ENABLE_RISK_HOLDS: boolean;
  ENABLE_NOTIFICATIONS: boolean;
}

const DEFAULT_FLAGS: BaselaneFlags = {
  ENABLE_BASELANE_PACK_V1: false,
  ENABLE_ORDER_TIMELINE: false,
  ENABLE_SELLER_WALLET: false,
  ENABLE_EARNINGS_DASHBOARD: false,
  ENABLE_RISK_HOLDS: false,
  ENABLE_NOTIFICATIONS: false,
};

interface UseBaselaneFlagsResult {
  flags: BaselaneFlags;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isEnabled: (key: keyof BaselaneFlags) => boolean;
  isAnyEnabled: boolean;
}

// Module-level cache for flags
let cachedFlags: BaselaneFlags | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

export function useBaselaneFlags(): UseBaselaneFlagsResult {
  const [flags, setFlags] = useState<BaselaneFlags>(cachedFlags || DEFAULT_FLAGS);
  const [loading, setLoading] = useState(!cachedFlags);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    // Return cached if still valid
    if (cachedFlags && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
      setFlags(cachedFlags);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("baselane_feature_flags")
        .select("flag_key, enabled");

      if (fetchError) {
        console.warn("[BASELANE_FLAGS] Failed to fetch flags:", fetchError);
        setError("Failed to load feature flags");
        return;
      }

      // Parse flags into typed object
      const parsedFlags: BaselaneFlags = { ...DEFAULT_FLAGS };
      
      data?.forEach((row) => {
        const key = row.flag_key as keyof BaselaneFlags;
        if (key in parsedFlags) {
          parsedFlags[key] = row.enabled;
        }
      });

      // Check if master toggle enables all
      if (parsedFlags.ENABLE_BASELANE_PACK_V1) {
        // Master toggle can enable all features
        // But individual toggles still respect their own setting
      }

      // Update cache
      cachedFlags = parsedFlags;
      cacheTimestamp = Date.now();
      setFlags(parsedFlags);
    } catch (err) {
      console.error("[BASELANE_FLAGS] Error:", err);
      setError("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (key: keyof BaselaneFlags): boolean => {
      // If master is ON and the specific flag key is not the master itself, enable it
      if (flags.ENABLE_BASELANE_PACK_V1 && key !== "ENABLE_BASELANE_PACK_V1") {
        return true;
      }
      return flags[key];
    },
    [flags]
  );

  // Check if any Baselane feature is enabled
  const isAnyEnabled = useMemo(() => {
    return flags.ENABLE_BASELANE_PACK_V1 ||
      flags.ENABLE_ORDER_TIMELINE ||
      flags.ENABLE_SELLER_WALLET ||
      flags.ENABLE_EARNINGS_DASHBOARD ||
      flags.ENABLE_RISK_HOLDS ||
      flags.ENABLE_NOTIFICATIONS;
  }, [flags]);

  return {
    flags,
    loading,
    error,
    refresh: fetchFlags,
    isEnabled,
    isAnyEnabled,
  };
}

/**
 * Simple hook to check a single Baselane flag
 */
export function useBaselaneFlag(key: keyof BaselaneFlags): boolean {
  const { isEnabled } = useBaselaneFlags();
  return isEnabled(key);
}

/**
 * Clear the flags cache (useful after admin updates)
 */
export function clearBaselaneFlagsCache(): void {
  cachedFlags = null;
  cacheTimestamp = 0;
}
