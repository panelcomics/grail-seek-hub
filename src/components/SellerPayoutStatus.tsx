import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SellerPayoutStatus() {
  const { hasStripeAccount, isOnboardingComplete, loading: statusLoading } = useSellerOnboarding();
  const [loading, setLoading] = useState(false);

  const handleManageAccount = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account-link", {
        body: { returnTo: "/settings" },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        if (window.top) {
          window.top.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error("No onboarding URL received");
      }
    } catch (error) {
      console.error("Error managing Stripe account:", error);
      toast.error("Failed to open Stripe account management");
    } finally {
      setLoading(false);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Setup</CardTitle>
          <CardDescription>Loading your seller status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seller Payout Setup</CardTitle>
        <CardDescription>
          Manage your Stripe Connect account for receiving payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            {hasStripeAccount && isOnboardingComplete ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            ) : hasStripeAccount ? (
              <Badge variant="secondary">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Setup Incomplete
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="mr-1 h-3 w-3" />
                Not Set Up
              </Badge>
            )}
          </div>
        </div>

        {hasStripeAccount && isOnboardingComplete ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your payout account is active. You can receive payments from sales.
            </p>
            <Button
              variant="outline"
              onClick={handleManageAccount}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Manage Stripe Account
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {hasStripeAccount
                ? "Your Stripe account setup is incomplete. Complete it to start receiving payments."
                : "You need to set up a Stripe account to sell on GrailSeeker and receive payments."}
            </p>
            <Button
              onClick={handleManageAccount}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  {hasStripeAccount ? "Complete Setup" : "Set Up Payouts"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
