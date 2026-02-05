 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Separator } from "@/components/ui/separator";
 import { formatCents } from "@/lib/fees";
 import { AlertCircle, Clock, CheckCircle, Lock } from "lucide-react";
 
 interface SellerPayoutBreakdownProps {
   grossCents: number;
   platformFeeCents: number;
   shippingCostCents: number;
   netPayoutCents: number;
   payoutStatus?: string | null;
   payoutHoldUntil?: string | null;
   payoutReleasedAt?: string | null;
 }
 
 export function SellerPayoutBreakdown({
   grossCents,
   platformFeeCents,
   shippingCostCents,
   netPayoutCents,
   payoutStatus,
   payoutHoldUntil,
   payoutReleasedAt,
 }: SellerPayoutBreakdownProps) {
   const getStatusBadge = () => {
     if (payoutReleasedAt) {
       return (
         <Badge variant="default" className="bg-green-600">
           <CheckCircle className="h-3 w-3 mr-1" />
           Released
         </Badge>
       );
     }
     
     if (payoutStatus === "on_hold" || payoutHoldUntil) {
       return (
         <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
           <Lock className="h-3 w-3 mr-1" />
           On Hold
         </Badge>
       );
     }
     
     if (payoutStatus === "available") {
       return (
         <Badge variant="default" className="bg-green-600">
           <CheckCircle className="h-3 w-3 mr-1" />
           Available
         </Badge>
       );
     }
     
     return (
       <Badge variant="outline">
         <Clock className="h-3 w-3 mr-1" />
         Pending
       </Badge>
     );
   };
 
   return (
     <Card className="border-blue-200 bg-blue-50/50 print:bg-white print:border-gray-200">
       <CardHeader className="pb-3">
         <div className="flex items-center justify-between">
           <CardTitle className="text-base flex items-center gap-2">
             <AlertCircle className="h-4 w-4 text-blue-600" />
             Seller Payout Breakdown
           </CardTitle>
           {getStatusBadge()}
         </div>
         <p className="text-xs text-muted-foreground">
           Only visible to you as the seller
         </p>
       </CardHeader>
       <CardContent className="space-y-2">
         {/* Gross */}
         <div className="flex justify-between text-sm">
           <span className="text-muted-foreground">Gross Sale</span>
           <span>{formatCents(grossCents)}</span>
         </div>
 
         {/* Platform Fee */}
         <div className="flex justify-between text-sm">
           <span className="text-muted-foreground">Platform Fee</span>
           <span className="text-red-600">-{formatCents(platformFeeCents)}</span>
         </div>
 
         {/* Shipping Cost (if seller paid for label) */}
         {shippingCostCents > 0 && (
           <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">Label Cost</span>
             <span className="text-red-600">-{formatCents(shippingCostCents)}</span>
           </div>
         )}
 
         <Separator className="my-2" />
 
         {/* Net Payout */}
         <div className="flex justify-between items-center">
           <span className="font-semibold">Net to You</span>
           <span className="font-bold text-lg text-green-700">
             {formatCents(netPayoutCents)}
           </span>
         </div>
 
         {/* Hold Notice */}
         {payoutHoldUntil && !payoutReleasedAt && (
           <div className="mt-3 p-2 bg-yellow-100 rounded-md border border-yellow-200">
             <p className="text-xs text-yellow-800">
               <Lock className="h-3 w-3 inline mr-1" />
               Payout held until{" "}
               {new Date(payoutHoldUntil).toLocaleDateString("en-US", {
                 month: "short",
                 day: "numeric",
                 year: "numeric"
               })}
             </p>
           </div>
         )}
 
         {/* Released Notice */}
         {payoutReleasedAt && (
           <div className="mt-3 p-2 bg-green-100 rounded-md border border-green-200">
             <p className="text-xs text-green-800">
               <CheckCircle className="h-3 w-3 inline mr-1" />
               Payout released on{" "}
               {new Date(payoutReleasedAt).toLocaleDateString("en-US", {
                 month: "short",
                 day: "numeric",
                 year: "numeric"
               })}
             </p>
           </div>
         )}
       </CardContent>
     </Card>
   );
 }