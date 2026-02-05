 /**
  * INVOICE TRUST ACTIONS
  * Print, PDF download, and copy buttons for invoices.
  */
 
 import { useState } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Printer, Download, Copy, Check } from "lucide-react";
 import { toast } from "sonner";
 
 interface InvoiceTrustActionsProps {
   orderId: string;
   trackingNumber?: string | null;
   shippingAddress?: {
     street1?: string;
     street2?: string;
     city?: string;
     state?: string;
     zip?: string;
     country?: string;
   } | null;
   shippingName?: string | null;
   totalCents: number;
 }
 
 export function InvoiceTrustActions({
   orderId,
   trackingNumber,
   shippingAddress,
   shippingName,
   totalCents,
 }: InvoiceTrustActionsProps) {
   const [copiedField, setCopiedField] = useState<string | null>(null);
 
   const handlePrint = () => {
     window.print();
   };
 
   const handleDownloadPDF = () => {
     // Browser-safe approach: trigger print dialog with PDF guidance
     toast.info("Save as PDF", {
       description: "In the print dialog, select 'Save as PDF' as your destination.",
       duration: 5000,
     });
     setTimeout(() => {
       window.print();
     }, 500);
   };
 
   const copyToClipboard = async (text: string, fieldName: string) => {
     try {
       await navigator.clipboard.writeText(text);
       setCopiedField(fieldName);
       toast.success(`${fieldName} copied`);
       setTimeout(() => setCopiedField(null), 2000);
     } catch {
       toast.error("Failed to copy");
     }
   };
 
   const formatAddress = (): string => {
     if (!shippingAddress) return "";
     const parts = [
       shippingName,
       shippingAddress.street1,
       shippingAddress.street2,
       `${shippingAddress.city || ""}, ${shippingAddress.state || ""} ${shippingAddress.zip || ""}`.trim(),
       shippingAddress.country,
     ].filter(Boolean);
     return parts.join("\n");
   };
 
   const CopyButton = ({ text, label, fieldKey }: { text: string; label: string; fieldKey: string }) => (
     <Button
       variant="ghost"
       size="sm"
       className="h-7 px-2 text-xs gap-1"
       onClick={() => copyToClipboard(text, label)}
       disabled={!text}
     >
       {copiedField === fieldKey ? (
         <Check className="h-3 w-3 text-green-500" />
       ) : (
         <Copy className="h-3 w-3" />
       )}
       {label}
     </Button>
   );
 
   return (
     <Card className="print:hidden">
       <CardContent className="pt-4 pb-4">
         <div className="flex flex-col gap-4">
           {/* Primary Actions */}
           <div className="flex flex-wrap gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={handlePrint}
               className="gap-2"
             >
               <Printer className="h-4 w-4" />
               Print Invoice
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={handleDownloadPDF}
               className="gap-2"
             >
               <Download className="h-4 w-4" />
               Download PDF
             </Button>
           </div>
 
           {/* Copy Actions */}
           <div className="flex flex-wrap gap-1 border-t pt-3">
             <span className="text-xs text-muted-foreground mr-2 self-center">Copy:</span>
             <CopyButton
               text={orderId.slice(0, 8).toUpperCase()}
               label="Order #"
               fieldKey="orderId"
             />
             {trackingNumber && (
               <CopyButton
                 text={trackingNumber}
                 label="Tracking #"
                 fieldKey="tracking"
               />
             )}
             {shippingAddress && (
               <CopyButton
                 text={formatAddress()}
                 label="Address"
                 fieldKey="address"
               />
             )}
             <CopyButton
               text={`$${(totalCents / 100).toFixed(2)}`}
               label="Total"
               fieldKey="total"
             />
           </div>
         </div>
       </CardContent>
     </Card>
   );
 }