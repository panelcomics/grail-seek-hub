 /**
  * INVOICE ADMIN DEBUG STRIP
  * Admin-only collapsible debug panel showing invoice data source and IDs.
  */
 
 import { useState } from "react";
 import { ChevronDown, ChevronRight, Bug } from "lucide-react";
 import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 import { Badge } from "@/components/ui/badge";
 
 interface InvoiceAdminDebugProps {
   orderId: string;
   loadedFrom: "orders" | "claim_sales" | "fallback" | "unknown";
   buyerId?: string | null;
   sellerId?: string | null;
   itemCount: number;
   totalCents: number;
   rawData?: Record<string, unknown>;
 }
 
 export function InvoiceAdminDebug({
   orderId,
   loadedFrom,
   buyerId,
   sellerId,
   itemCount,
   totalCents,
   rawData,
 }: InvoiceAdminDebugProps) {
   const [isOpen, setIsOpen] = useState(false);
 
   return (
     <div className="print:hidden bg-muted/30 border border-dashed border-muted-foreground/30 rounded-lg p-3 mt-4">
       <Collapsible open={isOpen} onOpenChange={setIsOpen}>
         <CollapsibleTrigger className="flex items-center gap-2 w-full text-left text-sm">
           {isOpen ? (
             <ChevronDown className="h-4 w-4 text-muted-foreground" />
           ) : (
             <ChevronRight className="h-4 w-4 text-muted-foreground" />
           )}
          <Bug className="h-4 w-4 text-primary" />
           <span className="font-medium text-muted-foreground">Admin Debug</span>
           <Badge variant="outline" className="ml-auto text-xs">
             {loadedFrom}
           </Badge>
         </CollapsibleTrigger>
         <CollapsibleContent className="mt-3 space-y-2 text-xs font-mono">
           <div className="grid grid-cols-2 gap-2">
             <div className="text-muted-foreground">Order ID:</div>
             <div className="truncate">{orderId}</div>
             
             <div className="text-muted-foreground">Loaded From:</div>
             <div>{loadedFrom}</div>
             
             <div className="text-muted-foreground">Buyer ID:</div>
             <div className="truncate">{buyerId || "—"}</div>
             
             <div className="text-muted-foreground">Seller ID:</div>
             <div className="truncate">{sellerId || "—"}</div>
             
             <div className="text-muted-foreground">Item Count:</div>
             <div>{itemCount}</div>
             
             <div className="text-muted-foreground">Total (cents):</div>
             <div>{totalCents}</div>
           </div>
           {rawData && (
             <details className="mt-2">
               <summary className="cursor-pointer text-muted-foreground">Raw Data</summary>
               <pre className="mt-1 p-2 bg-background rounded text-[10px] overflow-auto max-h-40">
                 {JSON.stringify(rawData, null, 2)}
               </pre>
             </details>
           )}
         </CollapsibleContent>
       </Collapsible>
     </div>
   );
 }