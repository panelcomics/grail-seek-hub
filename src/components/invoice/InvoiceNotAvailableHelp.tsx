 import { useState } from "react";
 import { Card, CardContent } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { AlertCircle, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 
 interface InvoiceNotAvailableHelpProps {
   reason?: "not_found" | "processing" | "permission_denied" | null;
   orderId?: string;
 }
 
 export function InvoiceNotAvailableHelp({ reason, orderId }: InvoiceNotAvailableHelpProps) {
   const [isOpen, setIsOpen] = useState(false);
   
   const shortId = orderId?.slice(0, 8) || "unknown";
   
   return (
     <Card className="max-w-2xl mx-auto">
       <CardContent className="p-8">
         <div className="text-center mb-6">
           <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
           <h2 className="text-lg font-semibold mb-2">Invoice Not Available</h2>
           <p className="text-muted-foreground">
             {reason === "permission_denied" 
               ? "You don't have permission to view this invoice."
               : `Invoice data unavailable for Order #${shortId}.`
             }
           </p>
         </div>
         
         {reason !== "permission_denied" && (
           <Collapsible open={isOpen} onOpenChange={setIsOpen}>
             <CollapsibleTrigger asChild>
               <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                 <span className="flex items-center gap-2">
                   <HelpCircle className="h-4 w-4" />
                   Why might this invoice be unavailable?
                 </span>
                 {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
               </Button>
             </CollapsibleTrigger>
             <CollapsibleContent className="mt-4">
               <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                 <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                   <li>
                     <strong>Order created before invoices were introduced</strong> — 
                     Older orders may not have full invoice data available.
                   </li>
                   <li>
                     <strong>Order still processing</strong> — 
                     Payment confirmation may still be in progress.
                   </li>
                   <li>
                     <strong>Test or QA transaction</strong> — 
                     Some test orders don't generate invoices.
                   </li>
                   <li>
                     <strong>Incomplete seller data</strong> — 
                     The seller's profile may be missing required information.
                   </li>
                 </ul>
               </div>
             </CollapsibleContent>
           </Collapsible>
         )}
         
         <p className="text-xs text-muted-foreground text-center mt-6">
           Need help? Contact support with Order #{shortId}
         </p>
       </CardContent>
     </Card>
   );
 }