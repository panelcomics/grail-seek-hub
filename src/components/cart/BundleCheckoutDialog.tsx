import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Package, DollarSign, Truck } from "lucide-react";

const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_51SPpDT8ehQu3cclJhGmo8kMmV91ibYmTuA9NMBX2BGxmc5FVYrv457weDF3tgVTdVEhd0vsM9ZY2tmsnDIG2KQKI00vioxatn1";

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

interface BundleCheckoutFormProps {
  bundleGroupId: string;
  orderIds: string[];
  onSuccess: () => void;
}

function BundleCheckoutForm({ bundleGroupId, orderIds, onSuccess }: BundleCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?bundle_group_id=${bundleGroupId}&order_ids=${orderIds.join(",")}`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay Now"
        )}
      </Button>
    </form>
  );
}

interface CartListingDetails {
  id: string;
  title: string;
  series: string | null;
  issue_number: string | null;
  price: number | null;
  shipping_price: number | null;
}

interface BundleCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: CartListingDetails[];
  sellerUsername: string | null;
}

export function BundleCheckoutDialog({ 
  open, 
  onOpenChange, 
  listings, 
  sellerUsername 
}: BundleCheckoutDialogProps) {
  const navigate = useNavigate();
  const { removeFromCart } = useCart();
  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bundleGroupId, setBundleGroupId] = useState<string | null>(null);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [bundleDetails, setBundleDetails] = useState<{
    totalAmountCents: number;
    bundleShippingCents: number;
    itemCount: number;
  } | null>(null);

  // Shipping form state
  const [shippingName, setShippingName] = useState("");
  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Calculate totals for display
  const totalItemsPrice = listings.reduce((sum, l) => sum + (l.price || 0), 0);
  const maxShipping = Math.max(...listings.map(l => l.shipping_price || 0));
  const additionalItems = listings.length - 1;
  const estimatedBundleShipping = maxShipping + additionalItems;
  const estimatedTotal = totalItemsPrice + estimatedBundleShipping;

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shippingName || !street1 || !city || !state || !postalCode) {
      toast.error("Please fill in all required shipping fields");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("marketplace-bundle-checkout", {
        body: {
          listingIds: listings.map(l => l.id),
          shipping: {
            name: shippingName,
            street1,
            street2,
            city,
            state,
            postal_code: postalCode,
            country: "US",
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setClientSecret(data.clientSecret);
      setBundleGroupId(data.bundleGroupId);
      setOrderIds(data.orderIds);
      setBundleDetails({
        totalAmountCents: data.totalAmountCents,
        bundleShippingCents: data.bundleShippingCents,
        itemCount: data.itemCount,
      });
      setStep("payment");
    } catch (error: any) {
      console.error("[BUNDLE-CHECKOUT] Error:", error);
      toast.error(error.message || "Failed to create bundle checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    // Remove all bundle items from cart
    listings.forEach(l => removeFromCart(l.id));
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      setStep("shipping");
      setClientSecret(null);
      setBundleGroupId(null);
      setOrderIds([]);
      setBundleDetails(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Bundle Checkout
          </DialogTitle>
          <DialogDescription>
            {listings.length} items from {sellerUsername || "seller"} • Combined shipping
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Order Summary</h4>
          <div className="space-y-1 text-sm">
            {listings.map((listing) => (
              <div key={listing.id} className="flex justify-between">
                <span className="truncate max-w-[200px]">
                  {listing.title || `${listing.series} #${listing.issue_number}`}
                </span>
                <span>${(listing.price || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Subtotal ({listings.length} items)
              </span>
              <span>${totalItemsPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Bundle Shipping
              </span>
              <span>
                {bundleDetails 
                  ? `$${(bundleDetails.bundleShippingCents / 100).toFixed(2)}`
                  : `~$${estimatedBundleShipping.toFixed(2)}`
                }
              </span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1">
              <span>Total</span>
              <span>
                {bundleDetails 
                  ? `$${(bundleDetails.totalAmountCents / 100).toFixed(2)}`
                  : `~$${estimatedTotal.toFixed(2)}`
                }
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bundle shipping: Base rate + $1 per additional item
          </p>
        </div>

        {step === "shipping" && (
          <form onSubmit={handleShippingSubmit} className="space-y-4">
            <h4 className="font-medium">Shipping Address</h4>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <Label htmlFor="street1">Street Address *</Label>
                <Input
                  id="street1"
                  value={street1}
                  onChange={(e) => setStreet1(e.target.value)}
                  placeholder="123 Main St"
                  required
                />
              </div>

              <div>
                <Label htmlFor="street2">Apt/Suite (Optional)</Label>
                <Input
                  id="street2"
                  value={street2}
                  onChange={(e) => setStreet2(e.target.value)}
                  placeholder="Apt 4B"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New York"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NY"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="postal">ZIP Code *</Label>
                <Input
                  id="postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="10001"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Bundle Order...
                </>
              ) : (
                "Continue to Payment"
              )}
            </Button>
          </form>
        )}

        {step === "payment" && clientSecret && bundleGroupId && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe" },
            }}
          >
            <BundleCheckoutForm
              bundleGroupId={bundleGroupId}
              orderIds={orderIds}
              onSuccess={handleSuccess}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
