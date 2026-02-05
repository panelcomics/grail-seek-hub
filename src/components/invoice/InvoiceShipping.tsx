 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { ExternalLink, MapPin, Package } from "lucide-react";
 import { formatCents } from "@/lib/fees";
 
 interface ShippingAddress {
   street1?: string;
   street2?: string;
   city?: string;
   state?: string;
   zip?: string;
   country?: string;
 }
 
 interface InvoiceShippingProps {
   shippingName?: string | null;
   shippingAddress?: ShippingAddress | null;
   shippingCents: number;
   carrier?: string | null;
   trackingNumber?: string | null;
   shippingStatus?: string | null;
 }
 
 export function InvoiceShipping({
   shippingName,
   shippingAddress,
   shippingCents,
   carrier,
   trackingNumber,
   shippingStatus,
 }: InvoiceShippingProps) {
   const getTrackingUrl = () => {
     if (!trackingNumber || !carrier) return null;
     const carrierLower = carrier.toLowerCase();
     if (carrierLower.includes("usps")) {
       return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
     }
     if (carrierLower.includes("ups")) {
       return `https://www.ups.com/track?tracknum=${trackingNumber}`;
     }
     if (carrierLower.includes("fedex")) {
       return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
     }
     return null;
   };
 
   const trackingUrl = getTrackingUrl();
 
   return (
     <Card className="print:shadow-none print:border-0">
       <CardHeader className="pb-3">
         <CardTitle className="text-base flex items-center gap-2">
           <Package className="h-4 w-4" />
           Shipping
         </CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Ship-To Address */}
         {(shippingName || shippingAddress) && (
           <div>
             <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
               <MapPin className="h-3 w-3" />
               Ship To
             </p>
             <div className="text-sm space-y-0.5">
               {shippingName && <p className="font-medium">{shippingName}</p>}
               {shippingAddress?.street1 && <p>{shippingAddress.street1}</p>}
               {shippingAddress?.street2 && <p>{shippingAddress.street2}</p>}
               {(shippingAddress?.city || shippingAddress?.state || shippingAddress?.zip) && (
                 <p>
                   {[shippingAddress.city, shippingAddress.state].filter(Boolean).join(", ")}{" "}
                   {shippingAddress.zip}
                 </p>
               )}
               {shippingAddress?.country && shippingAddress.country !== "US" && (
                 <p>{shippingAddress.country}</p>
               )}
             </div>
           </div>
         )}
 
         {/* Tracking Info */}
         {(carrier || trackingNumber || shippingStatus) && (
           <div className="pt-3 border-t">
             <div className="flex flex-wrap items-center gap-2">
               {carrier && (
                 <Badge variant="outline" className="text-xs">
                   {carrier}
                 </Badge>
               )}
               {shippingStatus && (
                 <Badge
                   variant={
                     shippingStatus === "delivered" ? "default" :
                     shippingStatus === "in_transit" || shippingStatus === "shipped" ? "secondary" :
                     "outline"
                   }
                   className="text-xs uppercase"
                 >
                   {shippingStatus.replace(/_/g, " ")}
                 </Badge>
               )}
             </div>
             {trackingNumber && (
               <div className="mt-2">
                 <p className="text-xs text-muted-foreground">Tracking Number</p>
                 {trackingUrl ? (
                   <a
                     href={trackingUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-sm text-primary hover:underline flex items-center gap-1"
                   >
                     {trackingNumber}
                     <ExternalLink className="h-3 w-3" />
                   </a>
                 ) : (
                   <p className="text-sm font-mono">{trackingNumber}</p>
                 )}
               </div>
             )}
           </div>
         )}
 
         {/* Shipping Cost */}
         <div className="flex justify-between pt-3 border-t">
           <span className="text-sm text-muted-foreground">Shipping</span>
           <span className="font-medium">
             {shippingCents > 0 ? formatCents(shippingCents) : "Free"}
           </span>
         </div>
       </CardContent>
     </Card>
   );
 }