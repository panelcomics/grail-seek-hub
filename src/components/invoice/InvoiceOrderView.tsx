 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { ArrowLeft } from "lucide-react";
 import { useNavigate } from "react-router-dom";
 
 import { InvoiceHeader } from "./InvoiceHeader";
 import { InvoiceLineItems } from "./InvoiceLineItems";
 import { InvoiceShipping } from "./InvoiceShipping";
 import { InvoiceTotals } from "./InvoiceTotals";
 import { SellerPayoutBreakdown } from "./SellerPayoutBreakdown";
 import { InvoiceBuyerActions } from "./InvoiceBuyerActions";
 import { calculateMarketplaceFeeWithCustomRate } from "@/lib/fees";
 import { InvoiceTrustActions } from "./InvoiceTrustActions";
 import { InvoiceAdminDebug } from "./InvoiceAdminDebug";
 import { useAdminCheck } from "@/hooks/useAdminCheck";
 
 interface InvoiceOrderRecord {
   id: string;
   amount_cents: number;
   shipping_charged_cents?: number | null;
   label_cost_cents?: number | null;
   status: string;
   payment_status: string | null;
   created_at: string;
   paid_at: string | null;
   buyer_id: string;
   seller_id: string;
   shipping_name?: string | null;
   shipping_address?: {
     street1?: string;
     street2?: string;
     city?: string;
     state?: string;
     zip?: string;
     country?: string;
   } | null;
   carrier?: string | null;
   tracking_number?: string | null;
   shipping_status?: string | null;
   platform_fee_amount?: number | null;
   platform_fee_rate?: number | null;
   payout_status?: string | null;
   payout_hold_until?: string | null;
   payout_released_at?: string | null;
   delivery_confirmed_at?: string | null;
   dataSource?: "orders" | "claim_sales" | "fallback" | "unknown";
   listing?: {
     id?: string;
     title?: string;
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
 }
 
 interface InvoiceOrderViewProps {
   order: InvoiceOrderRecord;
   userId: string;
   onOrderUpdate?: () => void;
 }
 
 export function InvoiceOrderView({ order, userId, onOrderUpdate }: InvoiceOrderViewProps) {
   const navigate = useNavigate();
   const [isMarkingReceived, setIsMarkingReceived] = useState(false);
   const { isAdmin } = useAdminCheck();
 
   const isBuyer = userId === order.buyer_id;
   const isSeller = userId === order.seller_id;
 
   const buyerName = order.buyer_profile?.display_name || 
     order.buyer_profile?.username || "Unknown Buyer";
   const sellerName = order.seller_profile?.display_name || 
     order.seller_profile?.username || "Unknown Seller";
 
   // Calculate line item - for now single item per order
   const lineItems = order.listing ? [{
     id: order.listing.id || order.id,
     title: order.listing.title || "Marketplace Item",
     imageUrl: order.listing.image_url,
     condition: order.listing.condition,
     grade: order.listing.grade,
     isSlab: order.listing.is_slab || false,
     quantity: 1,
     unitPriceCents: order.amount_cents,
   }] : [{
     id: order.id,
     title: "Marketplace Item",
     imageUrl: null,
     condition: null,
     grade: null,
     isSlab: false,
     quantity: 1,
     unitPriceCents: order.amount_cents,
   }];
 
   const subtotalCents = order.amount_cents;
   const shippingCents = order.shipping_charged_cents || 0;
   const totalCents = subtotalCents + shippingCents;
 
   // Seller payout calculations
   const grossCents = order.amount_cents;
   const platformFeeCents = order.platform_fee_amount 
     ? Math.round(order.platform_fee_amount * 100)
     : calculateMarketplaceFeeWithCustomRate(
         grossCents, 
         order.seller_profile?.custom_fee_rate
       ).fee_cents;
   const labelCostCents = order.label_cost_cents || 0;
   const netPayoutCents = grossCents - platformFeeCents - labelCostCents;
 
   const hasBeenDelivered = !!order.delivery_confirmed_at;
 
   const handleMarkReceived = async () => {
     try {
       setIsMarkingReceived(true);
       
       // Update order
       const { error } = await supabase
         .from("orders")
         .update({ 
           delivery_confirmed_at: new Date().toISOString(),
           shipping_status: "delivered"
         })
         .eq("id", order.id)
         .eq("buyer_id", userId);
 
       if (error) throw error;
 
       toast.success("Order marked as received!");
       onOrderUpdate?.();
     } catch (err) {
       console.error("[INVOICE] Error marking received:", err);
       toast.error("Failed to mark as received");
     } finally {
       setIsMarkingReceived(false);
     }
   };
 
   return (
     <div className="max-w-3xl mx-auto space-y-4 print:space-y-2 print:max-w-none">
       {/* Back Button - hidden in print */}
       <div className="print:hidden">
         <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
           <ArrowLeft className="h-4 w-4 mr-2" />
           Back to Orders
         </Button>
       </div>
 
       {/* Invoice Header */}
       <InvoiceHeader
         orderId={order.id}
         createdAt={order.created_at}
         status={order.status}
         paymentStatus={order.payment_status}
         buyerName={buyerName}
         sellerName={sellerName}
         isBuyer={isBuyer}
         isSeller={isSeller}
       />
 
       {/* Line Items */}
       <InvoiceLineItems items={lineItems} subtotalCents={subtotalCents} />
 
       {/* Shipping */}
       <InvoiceShipping
         shippingName={order.shipping_name}
         shippingAddress={order.shipping_address}
         shippingCents={shippingCents}
         carrier={order.carrier}
         trackingNumber={order.tracking_number}
         shippingStatus={order.shipping_status}
       />
 
       {/* Totals */}
       <InvoiceTotals
         subtotalCents={subtotalCents}
         shippingCents={shippingCents}
         totalCents={totalCents}
         paidAt={order.paid_at}
       />
 
       {/* Seller-Only Payout Breakdown */}
       {isSeller && (
         <SellerPayoutBreakdown
           grossCents={grossCents}
           platformFeeCents={platformFeeCents}
           shippingCostCents={labelCostCents}
           netPayoutCents={netPayoutCents}
           payoutStatus={order.payout_status}
           payoutHoldUntil={order.payout_hold_until}
           payoutReleasedAt={order.payout_released_at}
         />
       )}
 
       {/* Buyer Actions */}
       {isBuyer && (
         <InvoiceBuyerActions
           orderId={order.id}
           sellerId={order.seller_id}
           sellerName={sellerName}
           hasBeenDelivered={hasBeenDelivered}
           onMarkReceived={handleMarkReceived}
           isMarkingReceived={isMarkingReceived}
         />
       )}

       {/* Trust Actions (Print/PDF/Copy) */}
       <InvoiceTrustActions
         orderId={order.id}
         trackingNumber={order.tracking_number}
         shippingAddress={order.shipping_address}
         shippingName={order.shipping_name}
         totalCents={totalCents}
       />

       {/* Admin Debug Strip */}
       {isAdmin && (
         <InvoiceAdminDebug
           orderId={order.id}
           loadedFrom={order.dataSource || "unknown"}
           buyerId={order.buyer_id}
           sellerId={order.seller_id}
           itemCount={lineItems.length}
           totalCents={totalCents}
           rawData={order as unknown as Record<string, unknown>}
         />
       )}
     </div>
   );
 }