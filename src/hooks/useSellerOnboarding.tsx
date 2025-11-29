import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerOnboardingStatus {
  hasStripeAccount: boolean;
  isOnboardingComplete: boolean;
  hasShippingAddress: boolean;
  needsOnboarding: boolean;
  loading: boolean;
}

export const useSellerOnboarding = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SellerOnboardingStatus>({
    hasStripeAccount: false,
    isOnboardingComplete: false,
    hasShippingAddress: false,
    needsOnboarding: true,
    loading: true,
  });

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setStatus({
          hasStripeAccount: false,
          isOnboardingComplete: false,
          hasShippingAddress: false,
          needsOnboarding: true,
          loading: false,
        });
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("stripe_account_id, stripe_onboarding_complete, shipping_address")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        const hasAccount = !!profile?.stripe_account_id;
        const isComplete = profile?.stripe_onboarding_complete || false;
        const hasShipping = !!(profile?.shipping_address && 
          typeof profile.shipping_address === 'object' && 
          profile.shipping_address !== null &&
          (profile.shipping_address as any).street1 &&
          (profile.shipping_address as any).city &&
          (profile.shipping_address as any).state &&
          (profile.shipping_address as any).zip);

        setStatus({
          hasStripeAccount: hasAccount,
          isOnboardingComplete: isComplete,
          hasShippingAddress: hasShipping,
          needsOnboarding: !hasAccount || !isComplete || !hasShipping,
          loading: false,
        });
      } catch (error) {
        console.error("Error checking seller onboarding status:", error);
        setStatus({
          hasStripeAccount: false,
          isOnboardingComplete: false,
          hasShippingAddress: false,
          needsOnboarding: true,
          loading: false,
        });
      }
    };

    checkOnboardingStatus();
  }, [user]);

  return status;
};
