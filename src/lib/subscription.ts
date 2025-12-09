/**
 * SUBSCRIPTION HELPERS
 * ==========================================================================
 * Client-side helpers for checking subscription status.
 * 
 * IMPORTANT: These helpers are ONLY for feature gating.
 * They do NOT affect marketplace fees or trade eligibility.
 * ==========================================================================
 */

import { supabase } from "@/integrations/supabase/client";
import { SubscriptionTier, SUBSCRIPTION_TIERS } from "@/config/subscriptionsConfig";

interface SubscriptionData {
  subscription_tier: string | null;
  subscription_expires_at: string | null;
}

/**
 * Get the current user's subscription tier
 * Returns 'elite' if active subscription, 'free' otherwise
 */
export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('[SUBSCRIPTION] Error fetching tier:', error);
      return SUBSCRIPTION_TIERS.FREE;
    }

    return resolveSubscriptionTier(data);
  } catch (err) {
    console.error('[SUBSCRIPTION] Unexpected error:', err);
    return SUBSCRIPTION_TIERS.FREE;
  }
}

/**
 * Check if user has Elite access
 */
export async function hasEliteAccess(userId: string): Promise<boolean> {
  const tier = await getUserSubscriptionTier(userId);
  return tier === SUBSCRIPTION_TIERS.ELITE;
}

/**
 * Resolve subscription tier from profile data
 * Handles expiration checking
 */
export function resolveSubscriptionTier(data: SubscriptionData): SubscriptionTier {
  // If no subscription tier set, user is free
  if (!data.subscription_tier || data.subscription_tier !== 'elite') {
    return SUBSCRIPTION_TIERS.FREE;
  }

  // If expiration date is set and in the past, user is free
  if (data.subscription_expires_at) {
    const expiresAt = new Date(data.subscription_expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return SUBSCRIPTION_TIERS.FREE;
    }
  }

  return SUBSCRIPTION_TIERS.ELITE;
}

/**
 * Format subscription expiration date for display
 */
export function formatSubscriptionExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Unknown';
  
  const date = new Date(expiresAt);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
