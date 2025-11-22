import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, User, Package } from "lucide-react";
import { formatCents } from "@/lib/fees";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { ReportListingButton } from "@/components/ReportListingButton";
import { ShippingRateSelector } from "@/components/ShippingRateSelector";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.error('CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY not configured!');
}

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

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
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingMethod, setShippingMethod] = useState<"local_pickup" | "ship_nationwide">("ship_nationwide");
  const [selectedRate, setSelectedRate] = useState<any>(null);
  const [shippingAddress, setShippingAddress] = useState({
    line1: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });

  useEffect(() => {
    if (id) {
      fetchListing();
      logListingView();
    }
  }, [id]);

  const logListingView = async () => {
    try {
      await supabase.from("event_logs").insert({
        event: "listing_view",
        meta: { listing_id: id }
      });
    } catch (error) {
      console.error("Error logging listing view:", error);
    }
  };

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          *,
          inventory_items_public(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, completed_sales_count, is_verified_seller")
        .eq("user_id", data.user_id)
        .single();

      setListing(data);
      setSeller(profileData);
    } catch (error) {
      console.error("Error fetching listing:", error);
      toast.error("Listing not found");
      navigate("/market");
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

    if (shippingMethod === "ship_nationwide" && !selectedRate) {
      toast.error("Please select a shipping method");
      return;
    }

    setLoading(true);
    try {
      const requestBody: any = {
        listingId: id,
        shipping: {
          name: shippingName,
          ...shippingAddress,
        },
      };

      // Add Shippo data if shipping nationwide
      if (shippingMethod === "ship_nationwide" && selectedRate) {
        requestBody.shippoRate = {
          rate_id: selectedRate.rate_id,
          label_cost_cents: selectedRate.label_cost_cents,
          shipping_charged_cents: selectedRate.shipping_charged_cents,
          shipping_margin_cents: selectedRate.shipping_margin_cents,
        };
      }

      const { data, error } = await supabase.functions.invoke(
        "marketplace-create-payment-intent",
        {
          body: requestBody,
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

  const title = listing.title || listing.inventory_items_public?.title || "Comic Listing";
  const description = `${title}${listing.issue_number ? ` #${listing.issue_number}` : ""} - ${formatCents(listing.price_cents)} - Available now on our marketplace`;
  const imageUrl = listing.image_url || listing.inventory_items_public?.images?.[0]?.url || "";
  const canonicalUrl = `${window.location.origin}/l/${id}`;
  const sellerName = seller?.display_name || seller?.username || "Seller";
  const sellerSlug = seller?.username?.toLowerCase().replace(/\s+/g, '-');

  // JSON-LD structured data for Product
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: description,
    image: imageUrl,
    offers: {
      "@type": "Offer",
      price: (listing.price_cents / 100).toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "Person",
        name: sellerName,
      }
    }
  };

  const options = clientSecret ? { clientSecret } : undefined;

  return (
    <>
      <Helmet>
        <title>{title} | Buy Now</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={imageUrl} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <main className="flex-1 container py-4 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title}
                  className="aspect-[2/3] w-full object-cover rounded-lg mb-4"
                />
              ) : (
                <div className="aspect-[2/3] bg-muted rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-muted-foreground">No image available</span>
                </div>
              )}
              {listing.inventory_items_public?.comicvine_issue_id && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  Verified Scan
                </div>
              )}
              
              {seller && sellerSlug && (
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {seller.avatar_url ? (
                        <img src={seller.avatar_url} alt={sellerName} className="h-12 w-12 rounded-full" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Sold by</p>
                        <Link to={`/seller/${sellerSlug}`} className="font-semibold hover:underline">
                          {sellerName}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {seller.is_verified_seller && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                          {seller.completed_sales_count >= 10 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 border-amber-500/20 flex items-center gap-1">
                              <Shield className="h-3 w-3 fill-current" />
                              Pro
                            </Badge>
                          )}
                        </div>
                        {seller.completed_sales_count > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {seller.completed_sales_count} sale{seller.completed_sales_count !== 1 ? 's' : ''}
                          </p>
                        )}
                        {seller.is_verified_seller && (
                          <p className="text-xs text-muted-foreground mt-1">
                            This seller has been verified by GrailSeeker.
                          </p>
                        )}
                        {seller.completed_sales_count >= 10 && !seller.is_verified_seller && (
                          <p className="text-xs text-muted-foreground mt-1">
                            This seller has completed 10+ successful sales.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/seller/${sellerSlug}`}>View Profile</Link>
                        </Button>
                        <ReportListingButton listingId={id!} variant="outline" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {title}
              </h1>
              {listing.issue_number && (
                <p className="text-base md:text-lg text-muted-foreground mb-4">
                  Issue #{listing.issue_number}
                </p>
              )}

              <div className="text-2xl md:text-3xl font-bold text-primary mb-6">
                {formatCents(listing.price_cents)}
              </div>

              {listing.details && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Details</h3>
                  <p className="text-sm text-muted-foreground">{listing.details}</p>
                </div>
              )}

              {listing.condition_notes && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Condition Notes</h3>
                  <p className="text-sm text-muted-foreground">{listing.condition_notes}</p>
                </div>
              )}
              
              {listing.inventory_items_public?.is_slab && listing.inventory_items_public?.certification_number && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Certification Number</h3>
                  <p className="text-sm text-muted-foreground">{listing.inventory_items_public.certification_number}</p>
                </div>
              )}

              {!checkoutMode ? (
                <Card>
                  <CardContent className="p-4 md:p-6 space-y-4">
                    <h3 className="font-semibold">Shipping Method</h3>
                    <RadioGroup value={shippingMethod} onValueChange={(value: any) => setShippingMethod(value)}>
                      <div className="flex items-center space-x-2 border rounded-lg p-3">
                        <RadioGroupItem value="local_pickup" id="local_pickup" />
                        <Label htmlFor="local_pickup" className="flex-1 cursor-pointer">
                          <div>
                            <span className="font-medium">Local Pickup</span>
                            <p className="text-xs text-muted-foreground">No shipping fee</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tip: For local meetups, choose public locations and bring a friend when possible.
                            </p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border rounded-lg p-3">
                        <RadioGroupItem value="ship_nationwide" id="ship_nationwide" />
                        <Label htmlFor="ship_nationwide" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Ship Nationwide</span>
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-xs">
                              Test Mode
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Rates powered by Shippo</p>
                        </Label>
                      </div>
                    </RadioGroup>

                    <h3 className="font-semibold pt-2">Shipping Information</h3>
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

                    {/* Show ShippingRateSelector only when ship_nationwide is selected and address is filled */}
                    {shippingMethod === "ship_nationwide" && 
                     shippingAddress.line1 && 
                     shippingAddress.city && 
                     shippingAddress.state && 
                     shippingAddress.zip && (
                      <ShippingRateSelector
                        fromAddress={{
                          name: sellerName,
                          street1: "123 Seller St", // Placeholder - would come from seller profile
                          city: "San Francisco",
                          state: "CA",
                          zip: "94117",
                          country: "US",
                        }}
                        toAddress={{
                          name: shippingName || "Buyer",
                          street1: shippingAddress.line1,
                          city: shippingAddress.city,
                          state: shippingAddress.state,
                          zip: shippingAddress.zip,
                          country: shippingAddress.country,
                        }}
                        parcel={{
                          length: "12",
                          width: "9",
                          height: "3",
                          distance_unit: "in",
                          weight: "2",
                          mass_unit: "lb",
                        }}
                        onRateSelected={setSelectedRate}
                      />
                    )}

                    <Button onClick={handleBuyNow} disabled={loading} className="w-full">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue to Payment
                    </Button>
                  </CardContent>
                </Card>
              ) : options ? (
                <Card>
                  <CardContent className="p-4 md:p-6">
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
    </>
  );
}
