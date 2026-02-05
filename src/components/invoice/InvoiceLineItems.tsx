 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { AspectRatio } from "@/components/ui/aspect-ratio";
 import { Badge } from "@/components/ui/badge";
 import { formatCents } from "@/lib/fees";
 
 interface LineItem {
   id: string;
   title: string;
   imageUrl?: string | null;
   condition?: string | null;
   grade?: string | null;
   isSlab?: boolean;
   quantity: number;
   unitPriceCents: number;
 }
 
 interface InvoiceLineItemsProps {
   items: LineItem[];
   subtotalCents: number;
 }
 
 export function InvoiceLineItems({ items, subtotalCents }: InvoiceLineItemsProps) {
   return (
     <Card className="print:shadow-none print:border-0">
       <CardHeader className="pb-3">
         <CardTitle className="text-base">Items</CardTitle>
       </CardHeader>
       <CardContent className="space-y-4">
         {items.length === 0 ? (
           <p className="text-muted-foreground text-sm">No items found</p>
         ) : (
           items.map((item) => (
             <div
               key={item.id}
               className="flex gap-3 pb-4 border-b last:border-b-0 last:pb-0"
             >
               {/* Thumbnail */}
               <div className="w-16 h-20 flex-shrink-0 bg-muted rounded overflow-hidden print:w-12 print:h-16">
                 {item.imageUrl ? (
                   <AspectRatio ratio={3 / 4}>
                     <img
                       src={item.imageUrl}
                       alt={item.title}
                       className="w-full h-full object-cover"
                     />
                   </AspectRatio>
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                     No image
                   </div>
                 )}
               </div>
 
               {/* Item Details */}
               <div className="flex-1 min-w-0">
                 <p className="font-medium text-sm line-clamp-2">{item.title}</p>
                 <div className="flex flex-wrap gap-1.5 mt-1">
                   {item.isSlab ? (
                     <Badge variant="secondary" className="text-xs">
                       Slab {item.grade ? `• ${item.grade}` : ""}
                     </Badge>
                   ) : (
                     <Badge variant="outline" className="text-xs">
                       Raw {item.condition ? `• ${item.condition}` : ""}
                     </Badge>
                   )}
                 </div>
                 <p className="text-xs text-muted-foreground mt-1">
                   Qty: {item.quantity}
                 </p>
               </div>
 
               {/* Price */}
               <div className="text-right flex-shrink-0">
                 <p className="font-semibold">{formatCents(item.unitPriceCents)}</p>
                 {item.quantity > 1 && (
                   <p className="text-xs text-muted-foreground">
                     {formatCents(item.unitPriceCents * item.quantity)} total
                   </p>
                 )}
               </div>
             </div>
           ))
         )}
 
         {/* Subtotal */}
         <div className="flex justify-between pt-3 border-t">
           <span className="text-sm text-muted-foreground">Items Subtotal</span>
           <span className="font-medium">{formatCents(subtotalCents)}</span>
         </div>
       </CardContent>
     </Card>
   );
 }