 /**
  * INVOICE QA TOOLS
  * Admin-only tools for creating test invoices without payment.
  */
 
 import { useState } from "react";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { FileText, Loader2, ExternalLink, CheckCircle } from "lucide-react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { toast } from "sonner";
 import { Link } from "react-router-dom";
 
 export function InvoiceQATools() {
   const { user } = useAuth();
   const [creating, setCreating] = useState(false);
   const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
 
   const handleCreateTestInvoice = async () => {
     if (!user) {
       toast.error("Must be logged in");
       return;
     }
 
     setCreating(true);
     setCreatedOrderId(null);
 
     try {
       // Create a test order with realistic data
       // NO Stripe charge, NO wallet impact, NO checkout flow
       const testOrder = {
         buyer_id: user.id,
         seller_id: user.id, // Admin is both buyer and seller for test
         amount_cents: 12500, // $125.00
         shipping_charged_cents: 599, // $5.99
         status: "paid",
         payment_status: "paid",
         paid_at: new Date().toISOString(),
         shipping_name: "Test Collector",
         shipping_address: {
           street1: "123 Test Street",
           street2: "Apt 42",
           city: "Comic City",
           state: "NY",
           zip: "10001",
           country: "USA",
         },
         carrier: "USPS",
         tracking_number: "9400111899223456789012",
         shipping_status: "shipped",
         platform_fee_amount: 0.0375, // 3.75%
         platform_fee_rate: 0.0375,
         payout_status: "held",
         payout_hold_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
       };
 
       const { data, error } = await supabase
         .from("orders")
         .insert(testOrder)
         .select("id")
         .single();
 
       if (error) {
         console.error("[QA_TOOLS] Failed to create test order:", error);
         throw error;
       }
 
       setCreatedOrderId(data.id);
       toast.success("Test invoice created!");
     } catch (err) {
       console.error("[QA_TOOLS] Error:", err);
       toast.error("Failed to create test invoice");
     } finally {
       setCreating(false);
     }
   };
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <FileText className="h-5 w-5" />
           Invoice QA Tools
         </CardTitle>
         <CardDescription>
           Create test invoices for QA without triggering payments or wallet updates
         </CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <div className="p-3 bg-muted/50 rounded-lg text-sm">
           <p className="text-muted-foreground">
             <strong>Test Invoice:</strong> Creates a paid order with sample data including:
           </p>
           <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-1">
             <li>1 line item @ $125.00</li>
             <li>Shipping: $5.99</li>
             <li>Status: Paid + Shipped</li>
             <li>Sample tracking number</li>
             <li>7-day payout hold</li>
           </ul>
          <p className="mt-2 text-xs text-primary/70 italic">
            This doesn't affect payments, wallet balances, or Stripe.
          </p>
         </div>
 
         <Button
           onClick={handleCreateTestInvoice}
           disabled={creating}
           className="w-full"
         >
           {creating ? (
             <>
               <Loader2 className="h-4 w-4 mr-2 animate-spin" />
               Creating...
             </>
           ) : (
             <>
               <FileText className="h-4 w-4 mr-2" />
               Create Test Invoice (No Payment)
             </>
           )}
         </Button>
 
         {createdOrderId && (
          <div className="p-3 bg-accent/50 border border-accent rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-accent-foreground">
               <CheckCircle className="h-4 w-4" />
               <span className="font-medium text-sm">Test invoice created!</span>
             </div>
             <div className="flex flex-col gap-2">
               <Link to={`/orders/${createdOrderId}`}>
                 <Button variant="outline" size="sm" className="w-full gap-2">
                   <ExternalLink className="h-3 w-3" />
                   Open Invoice
                 </Button>
               </Link>
               <Link to="/orders">
                 <Button variant="ghost" size="sm" className="w-full gap-2">
                   Open Orders List
                 </Button>
               </Link>
             </div>
           </div>
         )}
       </CardContent>
     </Card>
   );
 }