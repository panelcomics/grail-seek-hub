import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SellerOnboardingStatus {
  hasStripeAccount: boolean;
  isOnboardingComplete: boolean;
  needsOnboarding: boolean;
  loading: boolean;
}

export const useSellerOnboarding = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SellerOnboardingStatus>({
    hasStripeAccount: false,
    isOnboardingComplete: false,
    needsOnboarding: true,
    loading: true,
  });

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setStatus({
          hasStripeAccount: false,
          isOnboardingComplete: false,
          needsOnboarding: true,
          loading: false,
        });
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("stripe_account_id, stripe_onboarding_complete")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        const hasAccount = !!profile?.stripe_account_id;
        const isComplete = profile?.stripe_onboarding_complete || false;

        setStatus({
          hasStripeAccount: hasAccount,
          isOnboardingComplete: isComplete,
          needsOnboarding: !hasAccount || !isComplete,
          loading: false,
        });
      } catch (error) {
        console.error("Error checking seller onboarding status:", error);
        setStatus({
          hasStripeAccount: false,
          isOnboardingComplete: false,
          needsOnboarding: true,
          loading: false,
        });
      }
    };

    checkOnboardingStatus();
  }, [user]);

  return status;
};
