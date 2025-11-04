import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Order {
  id: string;
  amount: number;
  shipping_amount: number;
  buyer_protection_fee: number;
  platform_fee_amount: number;
  total: number;
  payout_status: string;
  payout_hold_until: string;
  payment_status: string;
  created_at: string;
  claim_sale_id: string;
  claim_sales?: {
    title: string;
  };
}

export const PayoutManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          claim_sales (title)
        `)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutAction = async (orderId: string, action: "release" | "delay", delayHours?: number) => {
    try {
      setActionLoading(orderId);
      const { error } = await supabase.functions.invoke("release-payout", {
        body: { orderId, action, delayHours },
      });

      if (error) throw error;

      toast.success(`Payout ${action}d successfully`);
      fetchOrders();
    } catch (error) {
      console.error("Error managing payout:", error);
      toast.error("Failed to manage payout");
    } finally {
      setActionLoading(null);
    }
  };

  const getPayoutStatusBadge = (status: string, holdUntil: string) => {
    const holdDate = new Date(holdUntil);
    const now = new Date();
    const isPastHold = now >= holdDate;

    if (status === "released") {
      return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Released</Badge>;
    }
    
    if (status === "held" && isPastHold) {
      return <Badge variant="secondary" className="bg-warning"><AlertTriangle className="h-3 w-3 mr-1" />Ready</Badge>;
    }

    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Held</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payout Management</CardTitle>
          <CardDescription>Manage seller payouts and holds</CardDescription>
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
          <DollarSign className="h-5 w-5" />
          Payout Management
        </CardTitle>
        <CardDescription>
          Manually release or delay seller payouts
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No paid orders found</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Sale</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hold Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {order.claim_sales?.title || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-semibold">${order.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          Fee: ${order.platform_fee_amount?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPayoutStatusBadge(order.payout_status, order.payout_hold_until)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(order.payout_hold_until).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {order.payout_status !== "released" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handlePayoutAction(order.id, "release")}
                            disabled={actionLoading === order.id}
                          >
                            Release
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePayoutAction(order.id, "delay", 24)}
                            disabled={actionLoading === order.id}
                          >
                            Delay 24h
                          </Button>
                        </>
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