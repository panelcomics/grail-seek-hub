import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package } from "lucide-react";

interface OrderDetailRecord {
  id: string;
  amount_cents: number;
  status: string;
  payment_status: string | null;
  created_at: string;
  paid_at: string | null;
  listing?: {
    title?: string | null;
  } | null;
}

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to view orders");
      navigate("/auth");
      return;
    }
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const fetchOrder = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `*,
          listing:listing_id (title)
        `,
        )
        .eq("id", id)
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .maybeSingle();

      if (error) {
        console.error("[ORDER-DETAIL] Error fetching order:", error);
        throw error;
      }

      if (!data) {
        console.warn("[ORDER-DETAIL] Order not found", { id, userId: user?.id });
        toast.error("Order not found");
        navigate("/orders");
        return;
      }

      setOrder(data as OrderDetailRecord);
    } catch (err) {
      console.error("[ORDER-DETAIL] Failed to load order:", err);
      toast.error("Failed to load order");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <p className="text-center text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto py-12 px-4">
        <p className="text-center text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const status = order.payment_status || order.status;

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/orders")}>
           Back to Orders
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <Badge
              variant={
                status === "paid"
                  ? "default"
                  : status === "requires_payment"
                  ? "secondary"
                  : "outline"
              }
            >
              {status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">
                {order.listing?.title || "Marketplace order"}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Item Total</span>
                </div>
                <span className="font-semibold">
                  ${(order.amount_cents / 100).toFixed(2)}
                </span>
              </div>

              {status === "paid" && order.paid_at && (
                <div className="mt-4 p-3 bg-success/10 rounded-lg border border-success/40">
                  <p className="text-sm font-semibold text-success">
                    Payment received on {new Date(order.paid_at).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> This page currently shows a simplified
                  view of your order. Shipping and detailed fee breakdowns will
                  be added here as we finalize the marketplace checkout flow.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderDetail;
