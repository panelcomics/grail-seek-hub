import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Package, Truck, Clock, CheckCircle, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  amount: number;
  shipping_amount: number;
  total: number;
  payment_status: string;
  shipping_status: string;
  payout_status: string;
  payout_hold_until: string;
  tracking_number: string | null;
  created_at: string;
  claim_sale_id: string;
  claim_sales?: {
    title: string;
  };
}

export const SellerOrderManagement = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          claim_sales (title)
        `)
        .eq("seller_id", user?.id)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return;

    try {
      setUpdating(true);
      const { error } = await supabase.functions.invoke("confirm-delivery", {
        body: {
          orderId: selectedOrder.id,
          trackingNumber: trackingNumber || undefined,
        },
      });

      if (error) throw error;

      toast.success("Delivery confirmed! Payout processing initiated.");
      setSelectedOrder(null);
      setTrackingNumber("");
      fetchOrders();
    } catch (error) {
      console.error("Error confirming delivery:", error);
      toast.error("Failed to confirm delivery");
    } finally {
      setUpdating(false);
    }
  };

  const getShippingStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case "shipped":
        return <Badge variant="secondary"><Truck className="h-3 w-3 mr-1" />Shipped</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getPayoutStatusBadge = (status: string, holdUntil: string) => {
    const holdDate = new Date(holdUntil);
    const now = new Date();
    const hoursRemaining = Math.ceil((holdDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (status === "released") {
      return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Released</Badge>;
    }
    
    if (hoursRemaining <= 0) {
      return <Badge variant="secondary"><DollarSign className="h-3 w-3 mr-1" />Ready</Badge>;
    }

    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{hoursRemaining}h hold</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
          <CardDescription>Track deliveries and payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">Loading orders...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Order Management
        </CardTitle>
        <CardDescription>
          Confirm deliveries and track payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No paid orders yet</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Shipping</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-sm">
                          {order.claim_sales?.title || "Order"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {order.id.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${order.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {getShippingStatusBadge(order.shipping_status)}
                    </TableCell>
                    <TableCell>
                      {getPayoutStatusBadge(order.payout_status, order.payout_hold_until)}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.shipping_status !== "delivered" && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Confirm Delivery
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Delivery</DialogTitle>
                              <DialogDescription>
                                Mark this order as delivered and start payout processing
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label htmlFor="tracking">Tracking Number (Optional)</Label>
                                <Input
                                  id="tracking"
                                  value={trackingNumber}
                                  onChange={(e) => setTrackingNumber(e.target.value)}
                                  placeholder="Enter tracking number"
                                />
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Note:</strong> Confirming delivery will initiate the payout hold period based on your seller tier and transaction value.
                                </p>
                              </div>
                              <Button
                                onClick={handleConfirmDelivery}
                                disabled={updating}
                                className="w-full"
                              >
                                {updating ? "Confirming..." : "Confirm Delivery"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};