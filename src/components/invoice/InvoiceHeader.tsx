 import { Badge } from "@/components/ui/badge";
 import { Card, CardContent } from "@/components/ui/card";
 import { format } from "date-fns";
 
 interface InvoiceHeaderProps {
   orderId: string;
   createdAt: string;
   status: string;
   paymentStatus: string | null;
   buyerName: string;
   sellerName: string;
   isBuyer: boolean;
   isSeller: boolean;
 }
 
 export function InvoiceHeader({
   orderId,
   createdAt,
   status,
   paymentStatus,
   buyerName,
   sellerName,
   isBuyer,
   isSeller,
 }: InvoiceHeaderProps) {
   const displayStatus = paymentStatus || status;
   
   const statusVariant = 
     displayStatus === "paid" ? "default" :
     displayStatus === "shipped" ? "default" :
     displayStatus === "delivered" ? "default" :
     displayStatus === "requires_payment" ? "secondary" :
     displayStatus === "refunded" || displayStatus === "cancelled" ? "destructive" :
     "outline";
 
   return (
     <Card className="print:shadow-none print:border-b print:border-x-0 print:border-t-0 print:rounded-none">
       <CardContent className="pt-6">
         <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
           {/* Order Info */}
           <div>
             <div className="flex items-center gap-2 flex-wrap">
               <h1 className="text-2xl font-bold">Invoice</h1>
               <Badge variant={statusVariant} className="uppercase text-xs">
                 {displayStatus.replace(/_/g, " ")}
               </Badge>
             </div>
             <p className="text-muted-foreground text-sm mt-1">
               Order #{orderId.slice(0, 8).toUpperCase()}
             </p>
             <p className="text-muted-foreground text-sm">
               {format(new Date(createdAt), "MMMM d, yyyy 'at' h:mm a")}
             </p>
           </div>
 
           {/* Buyer/Seller Role Badge */}
           <div className="flex flex-col gap-1 text-right print:text-left">
             {isBuyer && (
               <Badge variant="outline" className="w-fit ml-auto print:ml-0">
                 You are the Buyer
               </Badge>
             )}
             {isSeller && (
               <Badge variant="outline" className="w-fit ml-auto print:ml-0">
                 You are the Seller
               </Badge>
             )}
           </div>
         </div>
 
         {/* Buyer/Seller Details Grid */}
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t">
           <div>
             <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Buyer</p>
             <p className="font-medium">{buyerName}</p>
           </div>
           <div className="sm:text-right print:text-left">
             <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Seller</p>
             <p className="font-medium">{sellerName}</p>
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }