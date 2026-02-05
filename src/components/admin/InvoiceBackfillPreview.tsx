 import { useState, useEffect } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Loader2, FileText, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { ScrollArea } from "@/components/ui/scroll-area";
 
 interface OrderPreviewItem {
   id: string;
   created_at: string;
   status: string;
   payment_status: string | null;
   amount_cents: number;
   eligibility: "eligible" | "blocked";
   blockReason?: string;
 }
 
 /**
  * Admin-only read-only panel showing orders eligible for future invoice backfill.
  * This is purely informational - no execution or mutation buttons.
  */
 export function InvoiceBackfillPreview() {
   const [orders, setOrders] = useState<OrderPreviewItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [stats, setStats] = useState({ eligible: 0, blocked: 0 });
 
   useEffect(() => {
     fetchOrders();
   }, []);
 
   const fetchOrders = async () => {
     try {
       setLoading(true);
       
       // Fetch recent orders to analyze for backfill eligibility
       const { data, error } = await supabase
         .from("orders")
         .select("id, created_at, status, payment_status, amount_cents, buyer_id, seller_id, listing_id")
         .order("created_at", { ascending: false })
         .limit(50);
 
       if (error) throw error;
 
       // Analyze each order for invoice backfill eligibility
       const analyzed: OrderPreviewItem[] = (data || []).map((order) => {
         const blockReasons: string[] = [];
         
         // Check for blocking conditions (read-only analysis)
         if (!order.payment_status || order.payment_status === "requires_payment") {
           blockReasons.push("Unpaid order");
         }
         
         if (!order.listing_id) {
           blockReasons.push("Missing listing reference");
         }
         
         if (!order.seller_id) {
           blockReasons.push("Missing seller ID");
         }
         
         if (!order.buyer_id) {
           blockReasons.push("Missing buyer ID");
         }
         
         const orderDate = new Date(order.created_at);
         const invoiceSystemLaunch = new Date("2025-01-01");
         if (orderDate < invoiceSystemLaunch) {
           blockReasons.push("Pre-invoice system order");
         }
         
         return {
           id: order.id,
           created_at: order.created_at,
           status: order.status,
           payment_status: order.payment_status,
           amount_cents: order.amount_cents,
           eligibility: blockReasons.length === 0 ? "eligible" : "blocked",
           blockReason: blockReasons.join(", ") || undefined,
         };
       });
 
       setOrders(analyzed);
       setStats({
         eligible: analyzed.filter((o) => o.eligibility === "eligible").length,
         blocked: analyzed.filter((o) => o.eligibility === "blocked").length,
       });
     } catch (err) {
       console.error("[BACKFILL-PREVIEW] Error fetching orders:", err);
     } finally {
       setLoading(false);
     }
   };
 
   if (loading) {
     return (
       <Card>
         <CardContent className="p-6 flex justify-center">
           <Loader2 className="h-6 w-6 animate-spin" />
         </CardContent>
       </Card>
     );
   }
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <FileText className="h-5 w-5" />
           Invoice Backfill Preview
          <Badge variant="outline" className="ml-2 text-xs">Read-Only</Badge>
         </CardTitle>
         <CardDescription>
          Informational analysis of orders for future invoice generation. No execution buttons — this is view-only.
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Summary Stats */}
         <div className="flex gap-4">
           <div className="flex items-center gap-2 text-sm">
             <CheckCircle2 className="h-4 w-4 text-primary" />
             <span>{stats.eligible} Eligible</span>
           </div>
           <div className="flex items-center gap-2 text-sm">
             <XCircle className="h-4 w-4 text-destructive" />
             <span>{stats.blocked} Blocked</span>
           </div>
         </div>
 
         {/* Order List */}
         <ScrollArea className="h-[300px] border rounded-lg">
           <div className="divide-y">
             {orders.map((order) => (
               <div key={order.id} className="p-3 flex items-center justify-between gap-4">
                 <div className="min-w-0 flex-1">
                   <p className="text-sm font-mono truncate">#{order.id.slice(0, 8)}</p>
                   <p className="text-xs text-muted-foreground">
                     {new Date(order.created_at).toLocaleDateString()}
                   </p>
                 </div>
                 <div className="text-right">
                   <Badge
                     variant={order.eligibility === "eligible" ? "default" : "secondary"}
                     className="gap-1"
                   >
                     {order.eligibility === "eligible" ? (
                       <CheckCircle2 className="h-3 w-3" />
                     ) : (
                       <AlertTriangle className="h-3 w-3" />
                     )}
                     {order.eligibility === "eligible" ? "Eligible" : "Blocked"}
                   </Badge>
                   {order.blockReason && (
                     <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                       {order.blockReason}
                     </p>
                   )}
                 </div>
               </div>
             ))}
             {orders.length === 0 && (
               <div className="p-6 text-center text-muted-foreground">
                 No orders to analyze
               </div>
             )}
           </div>
         </ScrollArea>
 
         <p className="text-xs text-muted-foreground">
          This preview doesn't affect payments or data. Backfill execution requires manual admin action elsewhere.
         </p>
       </CardContent>
     </Card>
   );
 }