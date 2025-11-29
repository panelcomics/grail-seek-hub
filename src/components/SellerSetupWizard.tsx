import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle2, DollarSign, Loader2, ArrowRight, Truck, MapPin } from "lucide-react";
import { toast } from "sonner";

interface SellerSetupWizardProps {
  hasStripeAccount: boolean;
  isOnboardingComplete: boolean;
  hasShippingAddress: boolean;
  returnTo: string;
}

export const SellerSetupWizard = ({
  hasStripeAccount,
  isOnboardingComplete,
  hasShippingAddress,
  returnTo,
}: SellerSetupWizardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    if (!hasStripeAccount || !isOnboardingComplete) return 1;
    if (!hasShippingAddress) return 2;
    return 3;
  });

  const [shippingForm, setShippingForm] = useState({
    name: "",
    street1: "",
    street2: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
    phone: "",
  });

  const handleStripeSetup = async () => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/auth");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account-link", {
        body: { returnTo: `/seller-setup?returnTo=${returnTo}&step=2` },
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
      console.error("Error starting Stripe Connect onboarding:", error);
      toast.error("Failed to start onboarding. Please try again.");
      setLoading(false);
    }
  };

  const handleShippingSubmit = async () => {
    // Validate required fields
    if (!shippingForm.name || !shippingForm.street1 || !shippingForm.city || 
        !shippingForm.state || !shippingForm.zip) {
      toast.error("Please fill in all required shipping address fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          shipping_address: shippingForm 
        })
        .eq("user_id", user?.id);

      if (error) throw error;

      toast.success("Shipping address saved!");
      setCurrentStep(3);
    } catch (error) {
      console.error("Error saving shipping address:", error);
      toast.error("Failed to save shipping address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    toast.success("Seller setup complete! You're ready to list items.");
    navigate(returnTo);
  };

  // Step 1: Stripe Connect
  if (currentStep === 1) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <DollarSign className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Step 1: Set Up Payouts</h2>
          <p className="text-muted-foreground">
            Connect with Stripe to receive payments securely
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Why Stripe Connect?
            </CardTitle>
            <CardDescription>
              Stripe Connect is a secure payment platform trusted by millions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Secure Payments</p>
                <p className="text-sm text-muted-foreground">
                  Stripe handles all payment processing securely
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Fast Payouts</p>
                <p className="text-sm text-muted-foreground">
                  Receive payments directly to your bank account
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Transparent Fees</p>
                <p className="text-sm text-muted-foreground">
                  See exactly what you'll receive after fees
                </p>
              </div>
            </div>

            <Button
              onClick={handleStripeSetup}
              disabled={loading}
              className="w-full mt-4"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Starting Setup...
                </>
              ) : (
                <>
                  Connect with Stripe
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Stripe to complete your account setup securely
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Shipping Address
  if (currentStep === 2) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Step 2: Default Ship-From Address</h2>
          <p className="text-muted-foreground">
            Where will you ship your items from?
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Shipping Address
            </CardTitle>
            <CardDescription>
              This address will be used for calculating shipping rates and generating labels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={shippingForm.name}
                onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street1">Street Address *</Label>
              <Input
                id="street1"
                value={shippingForm.street1}
                onChange={(e) => setShippingForm({ ...shippingForm, street1: e.target.value })}
                placeholder="123 Main St"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street2">Apartment, Suite, etc. (Optional)</Label>
              <Input
                id="street2"
                value={shippingForm.street2}
                onChange={(e) => setShippingForm({ ...shippingForm, street2: e.target.value })}
                placeholder="Apt 4B"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={shippingForm.city}
                  onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={shippingForm.state}
                  onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code *</Label>
                <Input
                  id="zip"
                  value={shippingForm.zip}
                  onChange={(e) => setShippingForm({ ...shippingForm, zip: e.target.value })}
                  placeholder="10001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={shippingForm.phone}
                  onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleShippingSubmit}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Confirmation
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
        <p className="text-muted-foreground">
          Your seller account is ready to go
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup Complete</CardTitle>
          <CardDescription>
            You can now create listings and start selling on GrailSeeker
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Stripe Payouts Connected</p>
              <p className="text-xs text-muted-foreground">You're ready to receive payments</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Shipping Address Saved</p>
              <p className="text-xs text-muted-foreground">
                {shippingForm.city && shippingForm.state 
                  ? `${shippingForm.city}, ${shippingForm.state}` 
                  : "Address on file"}
              </p>
            </div>
          </div>

          <Button
            onClick={handleComplete}
            className="w-full mt-4"
            size="lg"
          >
            Start Listing Items
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You can update these settings anytime in your profile
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
