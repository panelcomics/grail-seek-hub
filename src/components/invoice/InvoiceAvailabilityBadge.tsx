 import { Badge } from "@/components/ui/badge";
 import { FileText, Clock, Archive } from "lucide-react";
 
 interface InvoiceAvailabilityBadgeProps {
   order: {
     payment_status?: string | null;
     status?: string;
     created_at: string;
     listing?: { title?: string | null } | null;
     paid_at?: string | null;
   };
 }
 
 /**
  * Determines invoice availability status based on order data.
  * This is read-only logic derived from existing fetch results.
  */
 export function getInvoiceAvailabilityStatus(order: InvoiceAvailabilityBadgeProps["order"]): {
   status: "ready" | "pending" | "legacy";
   label: string;
 } {
   // Legacy: Orders created before invoice system (no listing data, old dates, etc.)
   // Using a cutoff date approach - orders before the invoice feature launch
   const orderDate = new Date(order.created_at);
   const invoiceSystemLaunchDate = new Date("2025-01-01"); // Adjust as needed
   
   // Check if order has minimal required data for invoice rendering
   const hasBasicInvoiceData = !!(
     order.payment_status &&
     (order.paid_at || order.payment_status === "paid")
   );
   
   // Legacy orders: created before invoice system and missing key data
   if (orderDate < invoiceSystemLaunchDate && !hasBasicInvoiceData) {
     return { status: "legacy", label: "Legacy Order" };
   }
   
   // Pending: Order exists but not yet paid / still processing
   if (order.payment_status === "requires_payment" || order.status === "pending") {
     return { status: "pending", label: "Invoice Pending" };
   }
   
   // Ready: Order is paid and has invoice data
   if (order.payment_status === "paid" || order.status === "paid") {
     return { status: "ready", label: "Invoice Ready" };
   }
   
   // Default to pending if status is unclear
   return { status: "pending", label: "Invoice Pending" };
 }
 
 export function InvoiceAvailabilityBadge({ order }: InvoiceAvailabilityBadgeProps) {
   const { status, label } = getInvoiceAvailabilityStatus(order);
   
   const variants: Record<typeof status, { variant: "default" | "secondary" | "outline"; icon: typeof FileText }> = {
     ready: { variant: "default", icon: FileText },
     pending: { variant: "secondary", icon: Clock },
     legacy: { variant: "outline", icon: Archive },
   };
   
   const { variant, icon: Icon } = variants[status];
   
   return (
     <Badge variant={variant} className="gap-1 text-xs">
       <Icon className="h-3 w-3" />
       {label}
     </Badge>
   );
 }