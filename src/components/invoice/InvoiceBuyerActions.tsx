 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Printer, MessageSquare, PackageCheck } from "lucide-react";
 import { toast } from "sonner";
 
 interface InvoiceBuyerActionsProps {
   orderId: string;
   sellerId: string;
   sellerName: string;
   hasBeenDelivered: boolean;
   onMarkReceived?: () => void;
   isMarkingReceived?: boolean;
 }
 
 export function InvoiceBuyerActions({
   orderId,
   sellerId,
   sellerName,
   hasBeenDelivered,
   onMarkReceived,
   isMarkingReceived,
 }: InvoiceBuyerActionsProps) {
   const handlePrint = () => {
     window.print();
   };
 
   const handleContactSeller = () => {
     // Try to navigate to existing message flow or show toast
     const messageUrl = `/messages?seller=${sellerId}&order=${orderId}`;
     // Check if messages route exists, otherwise show helpful toast
     toast.info(`Contact ${sellerName}`, {
       description: "Messaging feature coming soon. Please reach out via the seller's profile.",
     });
   };
 
   return (
     <Card className="print:hidden">
       <CardContent className="pt-6">
         <div className="flex flex-wrap gap-3">
           {/* Print Invoice */}
           <Button
             variant="outline"
             size="sm"
             onClick={handlePrint}
             className="flex items-center gap-2"
           >
             <Printer className="h-4 w-4" />
             Print Invoice
           </Button>
 
           {/* Contact Seller */}
           <Button
             variant="outline"
             size="sm"
             onClick={handleContactSeller}
             className="flex items-center gap-2"
           >
             <MessageSquare className="h-4 w-4" />
             Contact Seller
           </Button>
 
           {/* Mark as Received */}
           {onMarkReceived ? (
             <Button
               variant={hasBeenDelivered ? "secondary" : "default"}
               size="sm"
               onClick={onMarkReceived}
               disabled={hasBeenDelivered || isMarkingReceived}
               className="flex items-center gap-2"
             >
               <PackageCheck className="h-4 w-4" />
               {hasBeenDelivered ? "Received" : "Mark as Received"}
             </Button>
           ) : (
             <Button
               variant="outline"
               size="sm"
               disabled
               title="Coming soon"
               className="flex items-center gap-2 opacity-50"
             >
               <PackageCheck className="h-4 w-4" />
               Mark as Received
               <span className="text-xs text-muted-foreground ml-1">(Soon)</span>
             </Button>
           )}
         </div>
       </CardContent>
     </Card>
   );
 }