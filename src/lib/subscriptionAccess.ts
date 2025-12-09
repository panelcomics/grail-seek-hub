/**
 * SUBSCRIPTION ACCESS HELPERS
 * ==========================================================================
 * Feature gating helpers for Elite subscription features.
 * 
 * IMPORTANT: These helpers are ONLY for feature gating.
 * They do NOT affect marketplace fees, trade eligibility, or any existing
 * marketplace/payment/trade logic.
 * ==========================================================================
 */

import { supabase } from "@/integrations/supabase/client";
import { SUBSCRIPTION_TIERS, TIER_LIMITS } from "@/config/subscriptionsConfig";

interface SubscriptionData {
  subscription_tier: string | null;
  subscription_expires_at: string | null;
}

/**
 * Check if a user has Elite access (async, for server-side/edge functions)
 */
export async function hasEliteAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return isEliteActive(data);
  } catch (err) {
    console.error('[SUBSCRIPTION_ACCESS] Error checking elite access:', err);
    return false;
  }
}

/**
 * Enforce Elite access - throws a friendly error if user is not Elite
 */
export async function enforceEliteAccess(userId: string): Promise<{ success: true } | { success: false; error: string; code: 'NOT_ELITE' }> {
  const isElite = await hasEliteAccess(userId);
  
  if (!isElite) {
    return {
      success: false,
      error: 'This feature requires an Elite subscription. Upgrade to unlock unlimited access.',
      code: 'NOT_ELITE'
    };
  }
  
  return { success: true };
}

/**
 * Check if subscription is active Elite tier
 */
function isEliteActive(data: SubscriptionData): boolean {
  if (!data.subscription_tier || data.subscription_tier !== 'elite') {
    return false;
  }

  if (data.subscription_expires_at) {
    const expiresAt = new Date(data.subscription_expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return false;
    }
  }

  return true;
}

/**
 * Get the limit for a specific feature based on tier
 */
export function getFeatureLimit(tier: 'free' | 'elite', feature: 'savedSearches' | 'watchlistItems'): number {
  return TIER_LIMITS[tier][feature];
}

/**
 * Check if user has reached their limit for a feature
 */
export async function hasReachedFeatureLimit(
  userId: string,
  feature: 'savedSearches' | 'watchlistItems',
  currentCount: number
): Promise<{ limitReached: boolean; limit: number; isElite: boolean }> {
  const isElite = await hasEliteAccess(userId);
  const tier = isElite ? SUBSCRIPTION_TIERS.ELITE : SUBSCRIPTION_TIERS.FREE;
  const limit = getFeatureLimit(tier, feature);
  
  // -1 means unlimited
  if (limit === -1) {
    return { limitReached: false, limit: -1, isElite };
  }
  
  return { 
    limitReached: currentCount >= limit, 
    limit, 
    isElite 
  };
}
