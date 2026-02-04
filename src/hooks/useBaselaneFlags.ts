/**
 * BASELANE FEATURE FLAGS HOOK
 * ==========================================================================
 * React hook for accessing Baselane Pack v1 feature flags from app_settings.
 * Unified database-driven flags with caching and safe fallback.
 * Supports future per-role or per-user overrides.
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
  ENABLE_TAX_1099: boolean;
}

// Map app_settings keys to BaselaneFlags keys
const FLAG_KEY_MAP: Record<string, keyof BaselaneFlags> = {
  enable_baselane_pack_v1: "ENABLE_BASELANE_PACK_V1",
  enable_order_timeline: "ENABLE_ORDER_TIMELINE",
  enable_seller_wallet: "ENABLE_SELLER_WALLET",
  enable_earnings_dashboard: "ENABLE_EARNINGS_DASHBOARD",
  enable_risk_holds: "ENABLE_RISK_HOLDS",
  enable_notifications: "ENABLE_NOTIFICATIONS",
  enable_tax_1099: "ENABLE_TAX_1099",
};

const DEFAULT_FLAGS: BaselaneFlags = {
  ENABLE_BASELANE_PACK_V1: false,
  ENABLE_ORDER_TIMELINE: false,
  ENABLE_SELLER_WALLET: false,
  ENABLE_EARNINGS_DASHBOARD: false,
  ENABLE_RISK_HOLDS: false,
  ENABLE_NOTIFICATIONS: false,
  ENABLE_TAX_1099: false,
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

      // Read from unified app_settings table
      const { data, error: fetchError } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.keys(FLAG_KEY_MAP));

      if (fetchError) {
        console.warn("[BASELANE_FLAGS] Failed to fetch flags:", fetchError);
        setError("Failed to load feature flags");
        // Use defaults on error - safe fallback
        setFlags(DEFAULT_FLAGS);
        return;
      }

      // Parse flags into typed object
      const parsedFlags: BaselaneFlags = { ...DEFAULT_FLAGS };
      
      data?.forEach((row) => {
        const flagKey = FLAG_KEY_MAP[row.key];
        if (flagKey) {
          parsedFlags[flagKey] = row.value === "true";
        }
      });

      // Update cache
      cachedFlags = parsedFlags;
      cacheTimestamp = Date.now();
      setFlags(parsedFlags);
    } catch (err) {
      console.error("[BASELANE_FLAGS] Error:", err);
      setError("Failed to load feature flags");
      // Safe fallback to defaults
      setFlags(DEFAULT_FLAGS);
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
      flags.ENABLE_NOTIFICATIONS ||
      flags.ENABLE_TAX_1099;
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
