import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { formatCents } from "@/lib/fees";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMarketplaceRails } from "@/hooks/useMarketplaceRails";
import { InvoiceAvailabilityBadge } from "@/components/invoice/InvoiceAvailabilityBadge";

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { shouldShowInvoiceOrderView, shouldShowInvoiceAvailabilityBadges } = useMarketplaceRails();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      console.log("[ORDERS] Fetching marketplace orders for user:", user?.id);
      
      // Fetch purchases - sort paid first, then by date
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("orders")
        .select(`
          *,
          listing:listing_id (
            title,
            image_url,
            user_id
          )
        `)
        .eq("buyer_id", user?.id)
        .order("payment_status", { ascending: false }) // paid > requires_payment
        .order("created_at", { ascending: false });

      if (purchasesError) {
        console.error("[ORDERS] Error fetching purchases:", purchasesError);
        throw purchasesError;
      }

      console.log("[ORDERS] Fetched purchases:", {
        count: purchasesData?.length || 0,
        orders: purchasesData
      });

      // Fetch sales - sort paid first, then by date
      const { data: salesData, error: salesError } = await supabase
        .from("orders")
        .select(`
          *,
          listing:listing_id (
            title,
            image_url,
            user_id
          )
        `)
        .eq("seller_id", user?.id)
        .order("payment_status", { ascending: false }) // paid > requires_payment
        .order("created_at", { ascending: false });

      if (salesError) {
        console.error("[ORDERS] Error fetching sales:", salesError);
        throw salesError;
      }

      console.log("[ORDERS] Fetched sales:", {
        count: salesData?.length || 0,
        orders: salesData
      });

      setPurchases(purchasesData || []);
      setSales(salesData || []);
    } catch (error) {
      console.error("[ORDERS] Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (order: any) => {
    // Use payment_status if available, otherwise fall back to status
    const displayStatus = order.payment_status || order.status;
    
    const variants: Record<string, any> = {
      requires_payment: "secondary",
      paid: "default",
      shipped: "default",
      delivered: "default",
      refunded: "destructive",
      cancelled: "destructive",
    };

    return (
      <Badge variant={variants[displayStatus] || "secondary"}>
        {displayStatus.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const OrdersList = ({ orders }: { orders: any[] }) => (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        orders.map((order) => (
          <Card
            key={order.id}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                {/* Order Info Row */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold break-words">{order.listing?.title || "Unknown Item"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(order)}
                    {shouldShowInvoiceAvailabilityBadges && (
                      <InvoiceAvailabilityBadge order={order} />
                    )}
                    {!isMobile && shouldShowInvoiceOrderView && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="shrink-0"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Invoice
                      </Button>
                    )}
                  </div>
                </div>

                {/* Price and Mobile Action Row */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">{formatCents(order.amount_cents)}</span>
                  </div>
                  {isMobile && shouldShowInvoiceOrderView && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Invoice
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="purchases">
            <TabsList>
              <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
              <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="purchases">
              <OrdersList orders={purchases} />
            </TabsContent>
            <TabsContent value="sales">
              <OrdersList orders={sales} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
