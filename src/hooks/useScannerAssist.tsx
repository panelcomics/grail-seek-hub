/**
 * SCANNER ASSIST HOOK
 * ==========================================================================
 * Tracks daily Scanner Assist usage and enforces tier-based limits.
 * 
 * FREE users: 3 scans per day
 * ELITE users: Unlimited scans
 * ==========================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

const SCANNER_ASSIST_STORAGE_KEY = "grailseeker_scanner_assist_usage";
const FREE_TIER_DAILY_LIMIT = 3;

interface ScannerAssistUsage {
  date: string; // YYYY-MM-DD
  count: number;
}

interface UseScannerAssistResult {
  canScan: boolean;
  usedToday: number;
  dailyLimit: number;
  isUnlimited: boolean;
  loading: boolean;
  incrementUsage: () => void;
  remainingScans: number;
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function getStoredUsage(): ScannerAssistUsage {
  try {
    const stored = localStorage.getItem(SCANNER_ASSIST_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ScannerAssistUsage;
      // Reset if it's a new day
      if (parsed.date !== getTodayDateString()) {
        return { date: getTodayDateString(), count: 0 };
      }
      return parsed;
    }
  } catch (e) {
    console.warn("[SCANNER_ASSIST] Failed to parse stored usage:", e);
  }
  return { date: getTodayDateString(), count: 0 };
}

function setStoredUsage(usage: ScannerAssistUsage): void {
  try {
    localStorage.setItem(SCANNER_ASSIST_STORAGE_KEY, JSON.stringify(usage));
  } catch (e) {
    console.warn("[SCANNER_ASSIST] Failed to store usage:", e);
  }
}

export function useScannerAssist(): UseScannerAssistResult {
  const { user } = useAuth();
  const { isElite, loading: tierLoading } = useSubscriptionTier();
  const [usage, setUsage] = useState<ScannerAssistUsage>(getStoredUsage);

  // Sync from localStorage on mount and when user changes
  useEffect(() => {
    setUsage(getStoredUsage());
  }, [user?.id]);

  const incrementUsage = useCallback(() => {
    // Elite users don't need to track usage
    if (isElite) return;

    setUsage((prev) => {
      const today = getTodayDateString();
      const newUsage: ScannerAssistUsage = {
        date: today,
        count: prev.date === today ? prev.count + 1 : 1,
      };
      setStoredUsage(newUsage);
      return newUsage;
    });
  }, [isElite]);

  const dailyLimit = isElite ? -1 : FREE_TIER_DAILY_LIMIT;
  const isUnlimited = isElite;
  const usedToday = usage.date === getTodayDateString() ? usage.count : 0;
  const remainingScans = isUnlimited ? -1 : Math.max(0, dailyLimit - usedToday);
  const canScan = isUnlimited || usedToday < dailyLimit;

  return {
    canScan,
    usedToday,
    dailyLimit,
    isUnlimited,
    loading: tierLoading,
    incrementUsage,
    remainingScans,
  };
}
