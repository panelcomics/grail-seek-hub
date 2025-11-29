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
import { getListingImageUrl } from "@/lib/sellerUtils";
import { SellerBadge } from "@/components/SellerBadge";
import { FeaturedSellerBadge } from "@/components/FeaturedSellerBadge";
import { VerifiedSellerBadge } from "@/components/VerifiedSellerBadge";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MakeOfferModal } from "@/components/MakeOfferModal";
import { RequestTradeModal } from "@/components/RequestTradeModal";
import { Share2, Copy } from "lucide-react";
import { Listing, ListingProfile } from "@/types/listing";
import { ImageCarousel } from "@/components/ImageCarousel";
import { resolvePrice } from "@/lib/listingPriceUtils";

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
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<ListingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
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
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);

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
      // Use the same query structure as the working listings cards
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          type,
          price_cents,
          status,
          created_at,
          updated_at,
          user_id,
          title,
          details,
          condition_notes,
          image_url,
          issue_number,
          inventory_item_id,
          inventory_items!inner(
            id,
            title,
            series,
            issue_number,
            condition,
            cgc_grade,
            grading_company,
            certification_number,
            is_slab,
            is_key,
            key_issue,
            key_details,
            key_type,
            variant_description,
            images,
            for_sale,
            for_auction,
            is_for_trade,
            offers_enabled,
            user_id,
            details,
            comicvine_issue_id,
            sold_off_platform,
            sold_off_platform_date,
            sold_off_platform_channel,
            listed_price,
            shipping_price,
            primary_image_rotation
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        console.warn(`[LISTING_DETAIL] No listing found for id=${id}`);
        toast.error("This listing is no longer available");
        navigate("/market");
        return;
      }

      // Fetch profile separately with location data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, completed_sales_count, is_verified_seller, seller_tier, is_featured_seller, city, state, postal_code")
        .eq("user_id", data.user_id)
        .single();

      // CRITICAL: Transform data the same way as fetchListingsBase does
      // This ensures getListingImageUrl receives the same structure as cards
      const transformedListing = {
        ...data,                    // Spread listing fields (id, type, price_cents, etc.)
        ...data.inventory_items,    // Spread inventory_items fields to top level (images, title, series, etc.)
        listing_id: data.id,
        price_cents: data.price_cents,
        // Keep nested for backwards compatibility
        inventory_items: data.inventory_items,
      };
      
      setListing(transformedListing);
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

  const title = listing.title || listing.inventory_items?.title || "Comic Listing";
  const description = `${title}${listing.issue_number ? ` #${listing.issue_number}` : ""} - ${formatCents(listing.price_cents)} - Available now on our marketplace`;
  
  // CRITICAL: Pass listing directly (not nested) since we transformed it above
  // This matches exactly how ListingsCarousel calls getListingImageUrl(listing)
  const imageUrl = getListingImageUrl(listing);
  
  // Build complete images array from JSONB structure
  const allImages: Array<{ url: string }> = [];
  if (listing.images?.primary) {
    allImages.push({ url: listing.images.primary });
  }
  if (Array.isArray(listing.images?.others)) {
    listing.images.others.forEach((url: string) => {
      if (url) allImages.push({ url });
    });
  }
  // Fallback to imageUrl if no images in JSONB
  if (allImages.length === 0 && imageUrl && imageUrl !== "/placeholder.svg") {
    allImages.push({ url: imageUrl });
  }
  
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
              <div className="relative">
                {allImages.length > 0 ? (
                  <ImageCarousel 
                    images={allImages} 
                    className="mb-4"
                    rotation={listing.primary_image_rotation}
                  />
                ) : (
                  <div className="aspect-[2/3] bg-muted rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-muted-foreground">No image available</span>
                  </div>
                )}
                {/* Favorite button overlay */}
                <div className="absolute top-2 right-2 z-10">
                  <FavoriteButton listingId={id} showCount />
                </div>
              </div>
              {listing.inventory_items?.comicvine_issue_id && (
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
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {seller.is_featured_seller && <FeaturedSellerBadge />}
                          {seller.seller_tier === 'premium_dealer' && <SellerBadge tier="premium_dealer" />}
                          {seller.is_verified_seller && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Verified
                            </Badge>
                          )}
                          {!seller.is_verified_seller && seller.completed_sales_count >= 10 && (
                            <Badge variant="secondary" className="text-xs">
                              {seller.completed_sales_count}+ sales
                            </Badge>
                          )}
                        </div>
                        {seller?.city && seller?.state && (
                          <p className="text-xs text-muted-foreground mt-1.5">
                            📍 Located in {seller.city}, {seller.state}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Payments are processed securely via Stripe.
                        </p>
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
              <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">
                {title}
                {listing.issue_number && (
                  <span className="text-primary"> #{listing.issue_number}</span>
                )}
              </h1>
              
              {/* Key Issue Badge - Prominent */}
              {((listing.inventory_items as any)?.is_key || (listing.inventory_items as any)?.key_issue) && (listing.inventory_items as any)?.key_details && (
                <div className="mb-4">
                  <Badge 
                    variant="default" 
                    className="text-base font-bold px-4 py-2 bg-destructive text-destructive-foreground"
                  >
                    KEY ISSUE: {(listing.inventory_items as any).key_details}
                  </Badge>
                </div>
              )}

              <div className="text-2xl md:text-3xl font-bold text-primary mb-3">
                {(() => {
                  const price = resolvePrice(listing);
                  return price !== null ? `$${price.toFixed(2)}` : '$0.00';
                })()}
              </div>

              {/* Summary chips row */}
              <div className="flex flex-wrap gap-2 mb-6">
                {listing.inventory_items?.is_slab && listing.inventory_items?.cgc_grade && (
                  <Badge 
                    variant="secondary" 
                    className="text-sm font-bold px-3 py-1 bg-accent text-accent-foreground"
                  >
                    {listing.inventory_items.grading_company || 'CGC'} {listing.inventory_items.cgc_grade}
                    {listing.inventory_items.grading_company === 'CGC' && ' – Universal'}
                  </Badge>
                )}
                {!listing.inventory_items?.is_slab && listing.condition && (
                  <Badge variant="secondary" className="text-sm font-semibold px-3 py-1">
                    {listing.condition}
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className="text-xs flex items-center gap-1 min-h-[28px]"
                  style={{ 
                    backgroundColor: seller?.is_verified_seller ? '#E5E7EB' : 'transparent',
                    color: '#374151',
                    borderColor: seller?.is_verified_seller ? '#D1D5DB' : 'currentColor'
                  }}
                >
                  <Package className="h-3 w-3" />
                  {seller?.is_verified_seller ? 'Ships from verified seller' : 'Ships nationwide'}
                </Badge>
                {seller?.is_verified_seller && (
                  <Badge 
                    variant="outline" 
                    className="text-xs flex items-center gap-1 min-h-[28px]"
                    style={{ 
                      backgroundColor: '#1D4ED8',
                      color: '#FFFFFF',
                      borderColor: 'transparent'
                    }}
                  >
                    <Shield className="h-3 w-3" />
                    Verified seller
                  </Badge>
                )}
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
              
              {listing.inventory_items?.is_slab && listing.inventory_items?.certification_number && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Certification Number</h3>
                  <p className="text-sm text-muted-foreground">{listing.inventory_items.certification_number}</p>
                </div>
              )}

              {/* Action buttons */}
              {listing.inventory_items?.sold_off_platform ? (
                <Card className="mb-6 border-orange-500/20 bg-orange-500/5">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Badge variant="outline" className="mb-3 border-orange-500 text-orange-600">
                        Sold Off-Platform
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        This item was sold outside of GrailSeeker
                        {listing.inventory_items.sold_off_platform_channel && ` via ${listing.inventory_items.sold_off_platform_channel.replace('_', ' ')}`}
                        {listing.inventory_items.sold_off_platform_date && ` on ${new Date(listing.inventory_items.sold_off_platform_date).toLocaleDateString()}`}.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        This listing is kept for historical reference.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : !showCheckout ? (
                <div className="space-y-3 md:space-y-7 mb-6">
                  <Button 
                    onClick={() => {
                      if (!user) {
                        toast.error("Please log in to purchase");
                        navigate("/auth");
                        return;
                      }
                      setShowCheckout(true);
                      // Scroll to checkout form after it appears
                      setTimeout(() => {
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                      }, 100);
                    }}
                    className="w-full bg-[#E53935] hover:bg-[#C62828] text-white font-semibold shadow-md rounded-md py-6 min-h-[44px] transition-all"
                    size="lg"
                    aria-label={`Buy It Now for ${(() => {
                      const price = resolvePrice(listing);
                      return price !== null ? `$${price.toFixed(2)}` : '$0.00';
                    })()}`}
                  >
                    <span className="hidden sm:inline">
                      Buy It Now – {(() => {
                        const price = resolvePrice(listing);
                        return price !== null ? `$${price.toFixed(2)}` : '$0.00';
                      })()}
                    </span>
                    <span className="sm:hidden">
                      Buy It Now
                    </span>
                  </Button>
                  <div className="flex justify-center">
                    <div className="grid grid-cols-2 gap-3 max-w-xl w-full">
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={() => setShowOfferModal(true)}
                        className="min-h-[44px] rounded-md bg-white border border-neutral-400 text-neutral-800 font-medium hover:bg-neutral-100 hover:border-neutral-500 transition-colors"
                        aria-label="Make an offer on this listing"
                      >
                        Make Offer
                      </Button>
                      <Button 
                        variant="outline"
                        size="lg"
                        onClick={() => setShowTradeModal(true)}
                        className="min-h-[44px] rounded-md bg-white border border-neutral-400 text-neutral-800 font-medium hover:bg-neutral-100 hover:border-neutral-500 transition-colors"
                        aria-label="Request a trade for this listing"
                      >
                        Request Trade
                      </Button>
                    </div>
                  </div>
                </div>
              ) : !checkoutMode ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Complete Your Purchase</h2>
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
                      <>
                        {/* Verify seller has valid location data */}
                        {!seller?.city || !seller?.state || !seller?.postal_code ? (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm">
                            <p className="text-yellow-700 dark:text-yellow-400">
                              ⚠️ This seller hasn't completed their location setup. Shipping rates may not be accurate. Please contact the seller directly or choose local pickup.
                            </p>
                          </div>
                        ) : (
                          <ShippingRateSelector
                            fromAddress={{
                              name: sellerName,
                              street1: "123 Main St", // Placeholder - Shippo uses city/state/zip for rate calculation
                              city: seller.city,
                              state: seller.state,
                              zip: seller.postal_code,
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
                      </>
                    )}

                    <Button onClick={handleBuyNow} disabled={loading} className="w-full">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Continue to Payment
                    </Button>
                  </CardContent>
                  </Card>
                </>
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

              {/* Share Section - moved after action buttons */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Share This Listing
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const grade = listing.inventory_items?.cgc_grade 
                          ? `${listing.inventory_items.grading_company || 'CGC'} ${listing.inventory_items.cgc_grade}`
                          : listing.condition || '';
                        const priceText = listing.price_cents ? formatCents(listing.price_cents) : '$0.00';
                        const shareText = `${title}${grade ? ` - ${grade}` : ''} - ${priceText}. See details and buy here: ${window.location.href}`;
                        
                        try {
                          await navigator.clipboard.writeText(shareText);
                          toast.success("Share text copied to clipboard!");
                        } catch (err) {
                          toast.error("Failed to copy to clipboard");
                        }
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Share Text
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const shareUrl = encodeURIComponent(window.location.href);
                        const shareTitle = encodeURIComponent(title);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}`, '_blank', 'width=600,height=400');
                      }}
                    >
                      <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Facebook
                    </Button>

                    {navigator.share && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const grade = listing.inventory_items?.cgc_grade 
                            ? `${listing.inventory_items.grading_company || 'CGC'} ${listing.inventory_items.cgc_grade}`
                            : listing.condition || '';
                          const priceText = listing.price_cents ? formatCents(listing.price_cents) : '$0.00';
                          const shareText = `${title}${grade ? ` - ${grade}` : ''} - ${priceText}`;
                          
                          try {
                            await navigator.share({
                              title: title,
                              text: shareText,
                              url: window.location.href,
                            });
                          } catch (err) {
                            // User cancelled or share failed
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        More
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share to Facebook groups, Twitter, or copy the text to paste anywhere
                  </p>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>

      {listing && (
        <>
          <MakeOfferModal
            isOpen={showOfferModal}
            onClose={() => setShowOfferModal(false)}
            listingId={listing.id}
            itemTitle={listing.title || listing.inventory_items?.title || "Comic"}
          />
          <RequestTradeModal
            isOpen={showTradeModal}
            onClose={() => setShowTradeModal(false)}
            listingId={listing.id}
            itemTitle={listing.title || listing.inventory_items?.title || "Comic"}
          />
        </>
      )}
    </main>
    </>
  );
}
