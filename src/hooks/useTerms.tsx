import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { CURRENT_TERMS_VERSION, hasAcceptedLatestTerms } from "@/lib/termsUtils";

export const useTerms = () => {
  const { user } = useAuth();
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!user) {
      setHasAcceptedTerms(false);
      return;
    }

    // Check if user has accepted current terms version
    const checkTermsAcceptance = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("terms_version_accepted")
        .eq("user_id", user.id)
        .single();

      setHasAcceptedTerms(hasAcceptedLatestTerms(profile));
    };

    checkTermsAcceptance();
  }, [user]);

  const requireTerms = (action: () => void) => {
    if (!user) {
      // User not signed in, let the component handle auth
      action();
      return;
    }

    if (hasAcceptedTerms) {
      action();
    } else {
      setPendingAction(() => action);
      setShowTermsPopup(true);
    }
  };

  const handleAcceptTerms = async () => {
    if (!user) return;

    // Update profile with terms acceptance
    const { error } = await supabase
      .from("profiles")
      .update({
        terms_version_accepted: CURRENT_TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (!error) {
      setHasAcceptedTerms(true);
      setShowTermsPopup(false);
      
      // Execute pending action
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
    }
  };

  const handleDeclineTerms = () => {
    setShowTermsPopup(false);
    setPendingAction(null);
  };

  return {
    showTermsPopup,
    hasAcceptedTerms,
    requireTerms,
    handleAcceptTerms,
    handleDeclineTerms,
  };
};
