import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ExternalLink, Unplug } from "lucide-react";
import { useSellerOnboarding } from "@/hooks/useSellerOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SellerPayoutStatus() {
  const { user } = useAuth();
  const { hasStripeAccount, isOnboardingComplete, loading: statusLoading } = useSellerOnboarding();
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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
        const newWindow = window.open("about:blank", "_blank", "noopener,noreferrer");
        if (newWindow) {
          newWindow.location.href = data.url;
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

  const handleDisconnectStripe = async () => {
    if (!user) return;
    
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          stripe_account_id: null,
          stripe_onboarding_complete: false 
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Stripe account disconnected. You can now onboard with a different account.");
      
      // Reload the page to refresh the onboarding status
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error("Error disconnecting Stripe:", error);
      toast.error("Failed to disconnect Stripe account");
    } finally {
      setDisconnecting(false);
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
            <div className="flex flex-col gap-2">
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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={disconnecting}
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {disconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      <>
                        <Unplug className="mr-2 h-4 w-4" />
                        Disconnect Stripe Account
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Stripe Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your current Stripe connection. You'll need to onboard again with a new Stripe account. This is useful if you accidentally connected the wrong email or bank account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisconnectStripe}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
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
