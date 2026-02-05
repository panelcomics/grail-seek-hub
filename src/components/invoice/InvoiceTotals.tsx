 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Separator } from "@/components/ui/separator";
 import { formatCents } from "@/lib/fees";
 
 interface InvoiceTotalsProps {
   subtotalCents: number;
   shippingCents: number;
   taxCents?: number;
   discountCents?: number;
   totalCents: number;
   paidAt?: string | null;
 }
 
 export function InvoiceTotals({
   subtotalCents,
   shippingCents,
   taxCents = 0,
   discountCents = 0,
   totalCents,
   paidAt,
 }: InvoiceTotalsProps) {
   return (
     <Card className="print:shadow-none print:border-0">
       <CardHeader className="pb-3">
         <CardTitle className="text-base">Order Total</CardTitle>
       </CardHeader>
       <CardContent className="space-y-2">
         {/* Subtotal */}
         <div className="flex justify-between text-sm">
           <span className="text-muted-foreground">Items Subtotal</span>
           <span>{formatCents(subtotalCents)}</span>
         </div>
 
         {/* Shipping */}
         <div className="flex justify-between text-sm">
           <span className="text-muted-foreground">Shipping</span>
           <span>{shippingCents > 0 ? formatCents(shippingCents) : "Free"}</span>
         </div>
 
         {/* Tax (if applicable) */}
         {taxCents > 0 && (
           <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">Tax</span>
             <span>{formatCents(taxCents)}</span>
           </div>
         )}
 
         {/* Discount (if applicable) */}
         {discountCents > 0 && (
           <div className="flex justify-between text-sm text-green-600">
             <span>Discount</span>
             <span>-{formatCents(discountCents)}</span>
           </div>
         )}
 
         <Separator className="my-2" />
 
         {/* Total */}
         <div className="flex justify-between items-center">
           <span className="font-semibold text-lg">Total Paid</span>
           <span className="font-bold text-xl">{formatCents(totalCents)}</span>
         </div>
 
         {/* Payment Date */}
         {paidAt && (
           <p className="text-xs text-muted-foreground text-right">
             Paid on {new Date(paidAt).toLocaleDateString("en-US", {
               month: "short",
               day: "numeric",
               year: "numeric"
             })}
           </p>
         )}
       </CardContent>
     </Card>
   );
 }