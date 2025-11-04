import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, AlertCircle, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ConnectAccountStatus {
  hasAccount: boolean;
  isComplete: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export const PaymentSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<ConnectAccountStatus | null>(null);

  useEffect(() => {
    if (user) {
      checkAccountStatus();
    }
  }, [user]);

  // Check URL params for return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success("Stripe account connected successfully!");
      checkAccountStatus();
      // Clean up URL
      window.history.replaceState({}, "", "/settings");
    } else if (params.get("refresh") === "true") {
      toast.error("Setup was not completed. Please try again.");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const checkAccountStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("get-connect-account-status");

      if (error) throw error;

      setStatus(data);
    } catch (error) {
      console.error("Error checking account status:", error);
      toast.error("Failed to check account status");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke("create-connect-account-link");

      if (error) throw error;

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating account link:", error);
      toast.error("Failed to start onboarding");
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Settings
          </CardTitle>
          <CardDescription>Connect your Stripe account to receive payments</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Settings
        </CardTitle>
        <CardDescription>Connect your Stripe account to receive payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.isComplete ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-success mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-success">Connected & Ready</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your Stripe account is fully set up. You can now create claim sales and receive payments.
                </p>
                {status.accountId && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    Account ID: {status.accountId}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                Active
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Charges</p>
                <p className="font-semibold flex items-center gap-1">
                  {status.chargesEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-warning" />
                      Disabled
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payouts</p>
                <p className="font-semibold flex items-center gap-1">
                  {status.payoutsEnabled ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-warning" />
                      Disabled
                    </>
                  )}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Update Account Settings"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-warning">Action Required</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your Stripe account to receive payments from buyers. This is required to create claim sales.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">What you'll need:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Business or personal information</li>
                <li>• Bank account details</li>
                <li>• Tax identification number</li>
              </ul>
            </div>

            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Connect Stripe Account
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Stripe to complete the setup
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};