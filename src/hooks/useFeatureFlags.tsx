/**
 * FEATURE FLAGS HOOK
 * ==========================================================================
 * React hook for accessing feature flags with real-time updates.
 * Fetches flags from app_settings table and provides reactive state.
 * ==========================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FeatureFlags,
  getFeatureFlags,
  updateCachedFlags,
} from "@/config/featureFlags";

interface UseFeatureFlagsResult {
  flags: FeatureFlags;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isEnabled: (key: keyof FeatureFlags) => boolean;
}

export function useFeatureFlags(): UseFeatureFlagsResult {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch flags from app_settings table
      const { data, error: fetchError } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["bulk_scan_enabled", "scanner_assist_enabled", "analytics_enabled"]);

      if (fetchError) {
        console.warn("[FEATURE_FLAGS] Failed to fetch flags:", fetchError);
        // Use defaults on error
        return;
      }

      // Parse flags from app_settings
      const parsedFlags: Partial<FeatureFlags> = {};
      
      data?.forEach((setting) => {
        if (setting.key === "bulk_scan_enabled") {
          parsedFlags.bulkScanEnabled = setting.value === "true";
        } else if (setting.key === "scanner_assist_enabled") {
          parsedFlags.scannerAssistEnabled = setting.value === "true";
        } else if (setting.key === "analytics_enabled") {
          parsedFlags.analyticsEnabled = setting.value === "true";
        }
      });

      // Update cache and state
      updateCachedFlags(parsedFlags);
      setFlags(getFeatureFlags());
    } catch (err) {
      console.error("[FEATURE_FLAGS] Error:", err);
      setError("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const isEnabled = useCallback(
    (key: keyof FeatureFlags): boolean => {
      return flags[key];
    },
    [flags]
  );

  return {
    flags,
    loading,
    error,
    refresh: fetchFlags,
    isEnabled,
  };
}

/**
 * Simple hook to check a single flag
 */
export function useFeatureFlag(key: keyof FeatureFlags): boolean {
  const { flags } = useFeatureFlags();
  return flags[key];
}
