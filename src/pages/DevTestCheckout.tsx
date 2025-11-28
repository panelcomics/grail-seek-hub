import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, CreditCard, Package, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DevTestCheckout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingListingId, setProcessingListingId] = useState<string | null>(null);

  useEffect(() => {
    // Dev-only guard: prevent access in production
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
    if (!isDev) {
      navigate('/');
      return;
    }

    if (!user) {
      navigate('/auth');
      return;
    }

    fetchTestListings();
  }, [user, navigate]);

  const fetchTestListings = async () => {
    try {
      console.log("[TEST-CHECKOUT] Fetching test listings...");
      
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          title,
          price_cents,
          status,
          user_id,
          inventory_items!inner(
            title,
            images,
            series,
            issue_number,
            condition,
            shipping_price
          )
        `)
        .eq("status", "active")
        .limit(3);

      if (error) throw error;

      console.log("[TEST-CHECKOUT] Found listings:", data?.length || 0);
      setListings(data || []);
    } catch (error) {
      console.error("[TEST-CHECKOUT] Error fetching listings:", error);
      toast.error("Failed to load test listings");
    } finally {
      setLoading(false);
    }
  };

  const startTestCheckout = async (listingId: string, listingPrice: number) => {
    setProcessingListingId(listingId);
    
    try {
      console.log("[TEST-CHECKOUT] Starting checkout for listing:", listingId);
      console.log("[TEST-CHECKOUT] Using TEST MODE - Stripe test keys");
      console.log("[TEST-CHECKOUT] Test card: 4242 4242 4242 4242");
      
      // Create test shipping data
      const testShipping = {
        name: "Test Buyer",
        line1: "123 Test Street",
        city: "Test City",
        state: "CA",
        zip: "90210",
        country: "US"
      };

      console.log("[TEST-CHECKOUT] Test shipping address:", testShipping);

      const { data, error } = await supabase.functions.invoke(
        "marketplace-create-payment-intent",
        {
          body: {
            listingId,
            shipping: testShipping,
          }
        }
      );

      if (error) throw error;

      console.log("[TEST-CHECKOUT] Payment intent created successfully");
      console.log("[TEST-CHECKOUT] Order ID:", data.orderId);
      console.log("[TEST-CHECKOUT] Client Secret:", data.clientSecret ? "✓ Present" : "✗ Missing");

      // Log to event_logs for tracking
      await supabase.from("event_logs").insert({
        event: "test_checkout_initiated",
        meta: {
          listing_id: listingId,
          order_id: data.orderId,
          amount_cents: listingPrice,
          test_mode: true
        }
      });

      toast.success("Checkout session created! Redirecting...");
      
      // Navigate to the real checkout page with the order
      setTimeout(() => {
        navigate(`/listing/${listingId}`);
      }, 1000);
      
    } catch (error: any) {
      console.error("[TEST-CHECKOUT] Error:", error);
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setProcessingListingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <CardTitle className="text-2xl text-yellow-900 dark:text-yellow-100">
                🧪 TEST CHECKOUT MODE
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Development Testing Only</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>This page is for testing the purchase + shipping backend in TEST MODE.</p>
                <p className="font-bold">NO REAL CHARGES WILL BE MADE</p>
              </AlertDescription>
            </Alert>

            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-2">
              <h3 className="font-bold text-lg mb-2">Test Instructions:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Click "Start Test Checkout" on any listing below</li>
                <li>Use Stripe test card: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">4242 4242 4242 4242</code></li>
                <li>Use any future expiry date (e.g., 12/34)</li>
                <li>Use any 3-digit CVC (e.g., 123)</li>
                <li>Complete the checkout flow</li>
                <li>Verify in Supabase dashboard:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>orders table: new row with status "paid"</li>
                    <li>listings table: quantity decremented or status "sold"</li>
                    <li>Check browser console for detailed logs</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
              <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                <CreditCard className="inline h-4 w-4 mr-2" />
                Stripe Test Mode Active
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Environment: <Badge variant="outline">{import.meta.env.MODE}</Badge>
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Key configured: {import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.includes('pk_test') ? '✓' : '✗'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Listings */}
        <Card>
          <CardHeader>
            <CardTitle>Available Test Listings ({listings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-muted-foreground">No active listings available for testing.</p>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => {
                  const inventoryItem = listing.inventory_items;
                  const price = listing.price_cents / 100;
                  const shippingPrice = inventoryItem?.shipping_price || 0;
                  const total = price + shippingPrice;

                  return (
                    <div
                      key={listing.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Image */}
                        <div className="flex-shrink-0">
                          {inventoryItem?.images?.primary ? (
                            <img
                              src={inventoryItem.images.primary}
                              alt={listing.title}
                              className="w-24 h-36 object-cover rounded"
                            />
                          ) : (
                            <div className="w-24 h-36 bg-muted rounded flex items-center justify-center">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{listing.title}</h3>
                          {inventoryItem?.series && (
                            <p className="text-sm text-muted-foreground">
                              {inventoryItem.series}
                              {inventoryItem.issue_number && ` #${inventoryItem.issue_number}`}
                            </p>
                          )}
                          {inventoryItem?.condition && (
                            <Badge variant="secondary" className="mt-2">
                              {inventoryItem.condition}
                            </Badge>
                          )}

                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Item Price:</span>
                              <span className="font-medium">${price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Shipping:</span>
                              <span className="font-medium">${shippingPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t pt-1">
                              <span>Total:</span>
                              <span className="text-primary">${total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="flex-shrink-0">
                          <Button
                            onClick={() => startTestCheckout(listing.id, listing.price_cents)}
                            disabled={processingListingId === listing.id}
                            className="min-w-[140px]"
                          >
                            {processingListingId === listing.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting...
                              </>
                            ) : (
                              <>
                                <CreditCard className="mr-2 h-4 w-4" />
                                Start Test Checkout
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Console Log Instructions */}
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              📋 Monitoring & Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-bold mb-1">Browser Console:</h4>
              <p className="text-muted-foreground">
                Open DevTools (F12) and watch for logs prefixed with <code>[TEST-CHECKOUT]</code>
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-1">Supabase Tables to Check:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li><code>orders</code> - Verify new row with status "paid" after checkout</li>
                <li><code>listings</code> - Verify quantity decremented or status changed to "sold"</li>
                <li><code>event_logs</code> - Track checkout_started and payment_succeeded events</li>
                <li><code>notifications</code> - Check buyer and seller notifications created</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-1">Expected Flow:</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
                <li>Click "Start Test Checkout" → creates order + payment intent</li>
                <li>Complete Stripe test payment → webhook receives payment_intent.succeeded</li>
                <li>Order status updated to "paid"</li>
                <li>Listing quantity decremented (or marked sold if qty = 0)</li>
                <li>Notifications sent to buyer and seller</li>
                <li>If Shippo configured: shipping label created automatically</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DevTestCheckout;
