/**
 * ELITE ACCESS HOOK
 * ==========================================================================
 * React hook for checking Elite subscription status in components.
 * 
 * IMPORTANT: This hook is ONLY for feature gating.
 * It does NOT affect marketplace fees, trade eligibility, or any existing
 * marketplace/payment/trade logic.
 * ==========================================================================
 */

import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

interface UseEliteAccessResult {
  isElite: boolean;
  tier: 'free' | 'elite';
  loading: boolean;
  error: string | null;
  savedSearchLimit: number;
  watchlistLimit: number;
}

export function useEliteAccess(): UseEliteAccessResult {
  const { 
    tier, 
    isElite, 
    loading, 
    error,
    savedSearchLimit,
    watchlistLimit 
  } = useSubscriptionTier();

  return {
    isElite,
    tier,
    loading,
    error,
    savedSearchLimit,
    watchlistLimit,
  };
}
