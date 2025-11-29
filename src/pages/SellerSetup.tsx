import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, DollarSign, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";

export default function SellerSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { hasStripeAccount, isOnboardingComplete, loading: statusLoading } = useSellerOnboarding();
  
  const returnTo = searchParams.get("returnTo") || "/my-inventory";

  useEffect(() => {
    // If user is not logged in, redirect to auth
    if (!user) {
      navigate("/auth?redirect=/seller-setup");
      return;
    }

    // If already onboarded and success=true, redirect to return destination
    if (!statusLoading && hasStripeAccount && isOnboardingComplete) {
      const success = searchParams.get("success");
      if (success === "true") {
        toast.success("Stripe setup complete! You can now create listings.");
        navigate(returnTo);
      } else {
        navigate(returnTo);
      }
    }
  }, [user, hasStripeAccount, isOnboardingComplete, statusLoading, navigate, returnTo, searchParams]);

  const handleStartOnboarding = async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account-link", {
        body: { returnTo },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.url;
      } else {
        throw new Error("No onboarding URL received");
      }
    } catch (error) {
      console.error("Error starting Stripe Connect onboarding:", error);
      toast.error("Failed to start onboarding. Please try again.");
      setLoading(false);
    }
  };

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
          To sell on GrailSeeker, you need to complete a secure payment setup with Stripe
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Why Stripe Connect?
          </CardTitle>
          <CardDescription>
            Stripe Connect is a secure payment platform that enables safe transactions between buyers and sellers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Secure Payments</p>
              <p className="text-sm text-muted-foreground">
                Stripe handles all payment processing securely and is trusted by millions of businesses
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Fast Payouts</p>
              <p className="text-sm text-muted-foreground">
                Receive payments directly to your bank account on a regular schedule
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Buyer Protection</p>
              <p className="text-sm text-muted-foreground">
                Stripe's infrastructure provides buyer protection and dispute resolution
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <DollarSign className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Transparent Fees</p>
              <p className="text-sm text-muted-foreground">
                You'll see exactly what you'll receive after fees before listing any item
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ready to Start Selling?</CardTitle>
          <CardDescription>
            The setup process takes about 5-10 minutes. You'll need your business information and bank account details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleStartOnboarding}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Starting Setup...
              </>
            ) : (
              <>
                Complete Stripe Setup
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            You'll be redirected to Stripe to complete your account setup securely
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
