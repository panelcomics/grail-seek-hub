/**
 * SUBSCRIPTION TIER HOOK
 * ==========================================================================
 * React hook for accessing subscription status throughout the app.
 * 
 * IMPORTANT: This hook is ONLY for feature gating.
 * It does NOT affect marketplace fees or trade eligibility.
 * ==========================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionTier, SUBSCRIPTION_TIERS, TIER_LIMITS } from "@/config/subscriptionsConfig";
import { resolveSubscriptionTier } from "@/lib/subscription";

interface UseSubscriptionTierResult {
  tier: SubscriptionTier;
  isElite: boolean;
  isFree: boolean;
  loading: boolean;
  error: string | null;
  expiresAt: string | null;
  refresh: () => Promise<void>;
  // Limit helpers
  savedSearchLimit: number;
  watchlistLimit: number;
}

export function useSubscriptionTier(): UseSubscriptionTierResult {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>(SUBSCRIPTION_TIERS.FREE);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user?.id) {
      setTier(SUBSCRIPTION_TIERS.FREE);
      setExpiresAt(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('[SUBSCRIPTION_HOOK] Error:', fetchError);
        setError('Failed to load subscription status');
        setTier(SUBSCRIPTION_TIERS.FREE);
        return;
      }

      const resolvedTier = resolveSubscriptionTier({
        subscription_tier: data?.subscription_tier ?? null,
        subscription_expires_at: data?.subscription_expires_at ?? null,
      });

      setTier(resolvedTier);
      setExpiresAt(data?.subscription_expires_at ?? null);
    } catch (err) {
      console.error('[SUBSCRIPTION_HOOK] Unexpected error:', err);
      setError('Failed to load subscription status');
      setTier(SUBSCRIPTION_TIERS.FREE);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Subscribe to realtime updates on profile changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as { subscription_tier?: string; subscription_expires_at?: string };
          const resolvedTier = resolveSubscriptionTier({
            subscription_tier: newData?.subscription_tier ?? null,
            subscription_expires_at: newData?.subscription_expires_at ?? null,
          });
          setTier(resolvedTier);
          setExpiresAt(newData?.subscription_expires_at ?? null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const isElite = tier === SUBSCRIPTION_TIERS.ELITE;
  const isFree = tier === SUBSCRIPTION_TIERS.FREE;

  return {
    tier,
    isElite,
    isFree,
    loading,
    error,
    expiresAt,
    refresh: fetchSubscription,
    savedSearchLimit: TIER_LIMITS[tier].savedSearches,
    watchlistLimit: TIER_LIMITS[tier].watchlistItems,
  };
}
