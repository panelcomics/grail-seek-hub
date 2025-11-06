import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { formatCents } from "@/lib/fees";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ orderId, onSuccess }: { orderId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Complete Purchase
      </Button>
    </form>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    line1: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  useEffect(() => {
    if (id) fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*, inventory_items_public(*)")
        .eq("id", id)
        .single();

      if (error) throw error;
      setListing(data);
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast.error("Listing not found");
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      toast.error("Please log in to purchase");
      navigate("/auth");
      return;
    }

    if (!shippingName || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.state || !shippingAddress.zip) {
      toast.error("Please fill in all shipping information");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "marketplace-create-payment-intent",
        {
          body: {
            listingId: id,
            shipping: {
              name: shippingName,
              ...shippingAddress,
            },
          },
        }
      );

      if (error) throw error;

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setCheckoutMode(true);
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const options = clientSecret ? { clientSecret } : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="aspect-[2/3] bg-muted rounded-lg mb-4" />
              {listing.inventory_items_public?.comicvine_issue_id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Verified Scan
                </div>
              )}
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-2">
                {listing.title || listing.inventory_items_public?.title}
              </h1>
              {listing.issue_number && (
                <p className="text-lg text-muted-foreground mb-4">
                  Issue #{listing.issue_number}
                </p>
              )}

              <div className="text-3xl font-bold text-primary mb-6">
                {formatCents(listing.price_cents)}
              </div>

              {!checkoutMode ? (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        value={shippingAddress.line1}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, line1: e.target.value })
                        }
                        placeholder="123 Main St"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={shippingAddress.city}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, city: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          value={shippingAddress.state}
                          onChange={(e) =>
                            setShippingAddress({ ...shippingAddress, state: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={shippingAddress.zip}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, zip: e.target.value })
                        }
                      />
                    </div>

                    <Button onClick={handleBuyNow} disabled={loading} className="w-full">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue to Payment
                    </Button>
                  </CardContent>
                </Card>
              ) : options ? (
                <Card>
                  <CardContent className="p-6">
                    <Elements stripe={stripePromise} options={options}>
                      <CheckoutForm
                        orderId={orderId}
                        onSuccess={() => navigate(`/orders/${orderId}`)}
                      />
                    </Elements>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
