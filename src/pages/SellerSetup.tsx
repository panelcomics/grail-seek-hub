import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";
import { SellerSetupWizard } from "@/components/SellerSetupWizard";

export default function SellerSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    hasStripeAccount, 
    isOnboardingComplete, 
    hasShippingAddress,
    loading: statusLoading 
  } = useSellerOnboarding();
  
  const returnTo = searchParams.get("returnTo") || "/my-inventory";
  const step = searchParams.get("step");
  const success = searchParams.get("success");

  useEffect(() => {
    // If user is not logged in, redirect to auth
    if (!user) {
      navigate("/auth?redirect=/seller-setup");
      return;
    }

    // If returning from successful Stripe onboarding
    if (success === "true" && step === "2") {
      toast.success("Stripe setup complete!");
      return;
    }

    // If already fully onboarded, redirect to return destination
    if (!statusLoading && hasStripeAccount && isOnboardingComplete && hasShippingAddress) {
      toast.success("Seller setup already complete!");
      navigate(returnTo);
    }
  }, [user, hasStripeAccount, isOnboardingComplete, hasShippingAddress, statusLoading, navigate, returnTo, success, step]);

  if (statusLoading) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Complete Your Seller Setup</h1>
        <p className="text-muted-foreground">
          Two quick steps to start selling on GrailSeeker
        </p>
      </div>

      <SellerSetupWizard
        hasStripeAccount={hasStripeAccount}
        isOnboardingComplete={isOnboardingComplete}
        hasShippingAddress={hasShippingAddress}
        returnTo={returnTo}
      />
    </main>
  );
}
