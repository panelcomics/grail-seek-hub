import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to check if authenticated user has completed onboarding
 * Redirects to /onboarding if not completed
 * Skips check for auth, onboarding, and public pages
 */
export function useOnboardingCheck() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip check if still loading or no user
    if (loading || !user) return;

    // Skip check if already on these pages
    const skipPages = ["/auth", "/onboarding", "/terms", "/privacy", "/help", "/about"];
    if (skipPages.some(page => location.pathname.startsWith(page))) return;

    const checkOnboarding = async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("onboarding_completed, username, postal_code")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error checking onboarding:", error);
          return;
        }

        // Redirect if onboarding not completed
        if (!profile?.onboarding_completed || !profile?.username || !profile?.postal_code) {
          console.log("[ONBOARDING-CHECK] User needs to complete onboarding, redirecting...");
          navigate("/onboarding");
        }
      } catch (error) {
        console.error("Error in onboarding check:", error);
      }
    };

    checkOnboarding();
  }, [user, loading, location.pathname, navigate]);
}
