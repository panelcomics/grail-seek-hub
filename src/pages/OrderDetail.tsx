 import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
 import { Package, User, MapPin, CreditCard, Loader2, AlertCircle, ShieldOff } from "lucide-react";
 import { useAdminCheck } from "@/hooks/useAdminCheck";
import { OrderTimeline } from "@/components/marketplace-rails/OrderTimeline";
import { useMarketplaceRails } from "@/hooks/useMarketplaceRails";
 import { useBaselaneFlags } from "@/hooks/useBaselaneFlags";
 import { InvoiceOrderView } from "@/components/invoice/InvoiceOrderView";
import { InvoiceNotAvailableHelp } from "@/components/invoice/InvoiceNotAvailableHelp";

interface OrderDetailRecord {
  id: string;
  amount_cents: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  paid_at: string | null;
  buyer_id: string;
  seller_id: string;
  shipping_name?: string | null;
  shipping_address?: any;
  payment_method?: string | null;
   carrier?: string | null;
   tracking_number?: string | null;
   shipping_status?: string | null;
   platform_fee_amount?: number | null;
   platform_fee_rate?: number | null;
   payout_status?: string | null;
   payout_hold_until?: string | null;
   payout_released_at?: string | null;
   delivery_confirmed_at?: string | null;
   shipping_charged_cents?: number | null;
   label_cost_cents?: number | null;
  listing?: {
     id?: string;
    title?: string | null;
     image_url?: string | null;
     condition?: string | null;
     grade?: string | null;
     is_slab?: boolean;
  } | null;
  buyer_profile?: {
    username?: string | null;
    display_name?: string | null;
  } | null;
  seller_profile?: {
    username?: string | null;
    display_name?: string | null;
     custom_fee_rate?: number | null;
  } | null;
   /** Where the order data was loaded from */
   dataSource?: "orders" | "claim_sales" | "fallback" | "unknown";
}

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
 const { isAdmin } = useAdminCheck();
  const { shouldShowTimeline } = useMarketplaceRails();
   const { isEnabled } = useBaselaneFlags();
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
 const [notFoundReason, setNotFoundReason] = useState<"not_found" | "processing" | "permission_denied" | null>(null);
 const [dataSource, setDataSource] = useState<"orders" | "claim_sales" | "fallback" | "unknown">("unknown");
 
   const showInvoiceView = isEnabled("ENABLE_INVOICE_ORDER_VIEW");

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to view orders");
      navigate("/auth");
      return;
    }
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const fetchOrder = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setNotFoundReason(null);
     setDataSource("unknown");
      console.log("[ORDER-DETAIL] Fetching order:", { orderId: id, userId: user?.id });

      // Primary query: Full marketplace order with joins
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          listing:listing_id (id, title, image_url, condition, grade, is_slab)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[ORDER-DETAIL] Error fetching order:", error);
        // Don't throw - try fallback instead
      }

      // If primary query succeeded, fetch profiles separately
      if (data) {
        // Fetch buyer and seller profiles separately (no FK required)
        const [buyerResult, sellerResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, display_name")
            .eq("id", data.buyer_id)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("username, display_name, custom_fee_rate")
            .eq("id", data.seller_id)
            .maybeSingle(),
        ]);

        console.log("[ORDER-DETAIL] Order loaded successfully:", {
          orderId: data.id,
          buyer_id: data.buyer_id,
          seller_id: data.seller_id,
          status: data.status,
          payment_status: data.payment_status,
          amount_cents: data.amount_cents
        });

        setOrder({
          ...data,
          buyer_profile: buyerResult.data,
          seller_profile: sellerResult.data,
          dataSource: "orders",
        } as OrderDetailRecord);
        setDataSource("orders");
        return;
      }

      // FALLBACK: If primary query fails, try minimal order fetch
      console.log("[ORDER-DETAIL] Primary query returned null, attempting fallback...");
        
       // FALLBACK 1: Try claim_sales for legacy claim-sale orders
       const { data: claimData, error: claimError } = await supabase
         .from("claims")
         .select(`
           id,
           user_id,
           claim_sale_id,
           item_id,
           claimed_at,
           total_price,
           item_price,
           seller_fee,
           shipping_tier,
           claim_sale:claim_sale_id (
             id,
             title,
             seller_id,
             price
           ),
           claim_item:item_id (
             id,
             title,
             image_url,
             condition,
             category
           )
         `)
         .eq("id", id)
         .maybeSingle();
       
       if (claimError) {
         console.log("[ORDER-DETAIL] Claim query error (expected if not a claim):", claimError.message);
       }
       
       if (claimData && claimData.claim_sale) {
         console.log("[ORDER-DETAIL] Loaded from claim_sales:", { claimId: claimData.id });
         
         // Check permission: user must be buyer or seller (or admin)
         const claimSale = claimData.claim_sale as { id: string; title: string; seller_id: string | null; price: number };
         const isBuyerOrSeller = claimData.user_id === user?.id || claimSale.seller_id === user?.id;
         
         if (!isBuyerOrSeller && !isAdmin) {
           console.warn("[ORDER-DETAIL] Permission denied for claim:", { userId: user?.id });
           setNotFoundReason("permission_denied");
           return;
         }
         
         // Map claim data to order format
         const claimItem = claimData.claim_item as { id: string; title: string; image_url: string | null; condition: string; category: string } | null;
         setOrder({
           id: claimData.id,
           amount_cents: Math.round((claimData.total_price || 0) * 100),
           status: "paid",
           payment_status: "paid",
           created_at: claimData.claimed_at,
           paid_at: claimData.claimed_at,
           buyer_id: claimData.user_id,
           seller_id: claimSale.seller_id || "",
           listing: claimItem ? {
             id: claimItem.id,
             title: claimItem.title,
             image_url: claimItem.image_url,
             condition: claimItem.condition,
             grade: null,
             is_slab: false,
           } : null,
           buyer_profile: null,
           seller_profile: null,
           dataSource: "claim_sales",
         } as OrderDetailRecord);
         setDataSource("claim_sales");
         return;
       }
       
       // FALLBACK 2: Minimal orders fetch (no joins)
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        
        if (fallbackError) {
          console.error("[ORDER-DETAIL] Fallback query error:", fallbackError);
         // Check if it's a permission error
         if (fallbackError.code === "PGRST116" || fallbackError.message?.includes("permission")) {
           setNotFoundReason("permission_denied");
           return;
         }
        }
        
        if (fallbackData) {
         // Check permission: user must be buyer or seller (or admin)
         const isBuyerOrSeller = fallbackData.buyer_id === user?.id || fallbackData.seller_id === user?.id;
         if (!isBuyerOrSeller && !isAdmin) {
           console.warn("[ORDER-DETAIL] Permission denied:", { userId: user?.id });
           setNotFoundReason("permission_denied");
           return;
         }
         
          console.log("[ORDER-DETAIL] Fallback order loaded:", { orderId: fallbackData.id });
          // Set minimal order data - invoice components will gracefully hide missing sections
          setOrder({
            ...fallbackData,
            listing: null,
            buyer_profile: null,
            seller_profile: null,
           dataSource: "fallback",
          } as OrderDetailRecord);
         setDataSource("fallback");
          return;
        }
        
        // No order found in any query - show neutral message instead of error
        console.warn("[ORDER-DETAIL] Order not found in any query", { id, userId: user?.id });
        setNotFoundReason("processing");
        return;
    } catch (err) {
      console.error("[ORDER-DETAIL] Failed to load order:", err);
      // Log technical error internally, show user-friendly message
      console.error("[ORDER-DETAIL] Technical error details:", err);
    } finally {
      setIsLoading(false);
    }
  };

   // Loading state
   if (isLoading) {
    return (
      <main className="container mx-auto py-12 px-4">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </main>
    );
  }

  // Neutral empty-state when order not found or still processing
 if (notFoundReason === "permission_denied") {
   return (
     <main className="container mx-auto py-12 px-4">
       <div className="mb-6">
         <Button variant="outline" onClick={() => navigate("/orders")}>
           ← Back to Orders
         </Button>
       </div>
        <InvoiceNotAvailableHelp reason="permission_denied" orderId={id} />
     </main>
   );
 }
 
 if (notFoundReason === "processing" || (!order && !isLoading)) {
    return (
      <main className="container mx-auto py-12 px-4">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/orders")}>
            ← Back to Orders
          </Button>
        </div>
        <InvoiceNotAvailableHelp reason="processing" orderId={id} />
      </main>
    );
  }

   // Invoice view when flag is enabled
   if (showInvoiceView && order && user) {
     return (
       <main className="container mx-auto py-8 px-4">
         <InvoiceOrderView
           order={{
             ...order,
             shipping_address: order.shipping_address as any,
             listing: order.listing ? {
               id: order.listing.id,
               title: order.listing.title || undefined,
               image_url: order.listing.image_url,
               condition: order.listing.condition,
               grade: order.listing.grade,
               is_slab: order.listing.is_slab,
             } : null,
             buyer_profile: order.buyer_profile ? {
               username: order.buyer_profile.username,
               display_name: order.buyer_profile.display_name,
             } : undefined,
             seller_profile: order.seller_profile ? {
               username: order.seller_profile.username,
               display_name: order.seller_profile.display_name,
               custom_fee_rate: order.seller_profile.custom_fee_rate,
             } : undefined,
           }}
           userId={user.id}
           onOrderUpdate={fetchOrder}
         />
         
         {/* Order Timeline (Marketplace Rails) - still show after invoice */}
         {shouldShowTimeline && (
           <div className="max-w-3xl mx-auto mt-6 print:hidden">
             <OrderTimeline
               orderId={order.id}
               orderStatus={order.status}
               paymentStatus={order.payment_status}
               paidAt={order.paid_at}
             />
           </div>
         )}
       </main>
     );
   }
 
  // Safety check - should not reach here but handle gracefully
  if (!order) {
    return (
      <main className="container mx-auto py-12 px-4">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/orders")}>
            ← Back to Orders
          </Button>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Invoice data unavailable for this order.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const status = order.payment_status || order.status;
  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;

  const buyerName = order.buyer_profile?.username || order.buyer_profile?.display_name || "Unknown Buyer";
  const sellerName = order.seller_profile?.username || order.seller_profile?.display_name || "Unknown Seller";

  return (
    <main className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/orders")}>
          ← Back to Orders
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl break-words">Order #{order.id.slice(0, 8)}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(order.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {isBuyer && (
                  <Badge variant="outline">You are the Buyer</Badge>
                )}
                {isSeller && (
                  <Badge variant="outline">You are the Seller</Badge>
                )}
              </div>
            </div>
            <Badge
              className="shrink-0"
              variant={
                status === "paid"
                  ? "default"
                  : status === "requires_payment"
                  ? "secondary"
                  : "outline"
              }
            >
              {status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Item Details */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Item</h3>
            </div>
            <p className="text-lg break-words">
              {order.listing?.title || `Order #${order.id.slice(0, 8)}`}
            </p>
          </div>

          <Separator />

          {/* Buyer & Seller Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Buyer</h3>
              </div>
              <p className="text-sm break-words">{buyerName}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Seller</h3>
              </div>
              <p className="text-sm break-words">{sellerName}</p>
            </div>
          </div>

          <Separator />

          {/* Shipping Address */}
          {order.shipping_address && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Shipping Address</h3>
                </div>
                <div className="text-sm space-y-1">
                  {order.shipping_name && <p className="font-medium">{order.shipping_name}</p>}
                  {order.shipping_address.street1 && <p>{order.shipping_address.street1}</p>}
                  {order.shipping_address.street2 && <p>{order.shipping_address.street2}</p>}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zip}
                  </p>
                  {order.shipping_address.country && <p>{order.shipping_address.country}</p>}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Payment Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Payment</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Order Total</span>
                <span className="text-lg font-bold">
                  ${(order.amount_cents / 100).toFixed(2)}
                </span>
              </div>
              {order.payment_method && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Method</span>
                  <span className="text-sm">{order.payment_method}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Status Messages */}
          {status === "paid" && order.paid_at && (
            <div className="p-4 bg-success/10 rounded-lg border border-success/40">
              <p className="text-sm font-semibold text-success">
                ✓ Payment received on {new Date(order.paid_at).toLocaleDateString()}
              </p>
              {isSeller && (
                <p className="text-xs text-muted-foreground mt-1">
                  Payout will be processed after delivery confirmation
                </p>
              )}
            </div>
          )}

          {status === "requires_payment" && isBuyer && (
            <div className="p-4 bg-warning/10 rounded-lg border border-warning/40">
              <p className="text-sm font-semibold text-warning">
                ⚠ Payment not completed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Please complete checkout to confirm this order.
              </p>
            </div>
          )}

          {/* Future Features Note */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Shipping tracking and detailed fee breakdowns will
              be added as we finalize the marketplace shipping flow.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Order Timeline (Marketplace Rails) */}
      {shouldShowTimeline && order && (
        <OrderTimeline
          orderId={order.id}
          orderStatus={order.status}
          paymentStatus={order.payment_status}
          paidAt={order.paid_at}
        />
      )}
    </main>
  );
};

export default OrderDetail;
