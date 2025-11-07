import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Package, Truck, Clock, CheckCircle, DollarSign, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  label_url: string | null;
  shippo_rate_id: string | null;
  label_cost_cents: number | null;
  shipping_charged_cents: number | null;
  shipping_margin_cents: number | null;
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
  const [carrier, setCarrier] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [generatingLabel, setGeneratingLabel] = useState(false);

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

  const validateTrackingNumber = (carrier: string, tracking: string): boolean => {
    if (!tracking.trim()) return false;
    
    switch (carrier) {
      case "USPS":
        // USPS: 20-22 digits or starts with specific patterns
        return /^(9[0-9]{19,21}|[A-Z]{2}[0-9]{9}US)$/.test(tracking);
      case "UPS":
        // UPS: 18 characters starting with 1Z
        return /^1Z[A-Z0-9]{16}$/.test(tracking);
      case "FedEx":
        // FedEx: 12 or 14 digits
        return /^[0-9]{12,14}$/.test(tracking);
      case "Other":
        // Other: at least 5 characters
        return tracking.length >= 5;
      default:
        return false;
    }
  };

  const handleMarkShipped = async () => {
    if (!selectedOrder) return;

    if (!carrier) {
      toast.error("Please select a carrier");
      return;
    }

    if (!validateTrackingNumber(carrier, trackingNumber)) {
      toast.error(`Invalid tracking number format for ${carrier}`);
      return;
    }

    try {
      setUpdating(true);
      
      // Update order with shipping info
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          shipping_status: "shipped",
          carrier,
          tracking_number: trackingNumber,
          shipped_at: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (updateError) throw updateError;

      // Send email notification to buyer
      const { error: emailError } = await supabase.functions.invoke("send-shipping-notification", {
        body: { orderId: selectedOrder.id },
      });

      if (emailError) {
        console.error("Error sending notification:", emailError);
        // Don't fail the whole operation if email fails
        toast.warning("Order marked as shipped, but email notification failed");
      } else {
        toast.success("Order marked as shipped! Buyer has been notified.");
      }

      setShowShipModal(false);
      setSelectedOrder(null);
      setTrackingNumber("");
      setCarrier("");
      setShippingNote("");
      fetchOrders();
    } catch (error) {
      console.error("Error marking as shipped:", error);
      toast.error("Failed to mark order as shipped");
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedOrder) return;

    try {
      setUpdating(true);
      const { error } = await supabase.functions.invoke("confirm-delivery", {
        body: {
          orderId: selectedOrder.id,
          trackingNumber: selectedOrder.tracking_number || trackingNumber || undefined,
        },
      });

      if (error) throw error;

      toast.success("Delivery confirmed! Payout processing initiated.");
      setShowDeliveryModal(false);
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

  const handleDownloadLabel = (order: Order) => {
    if (order.label_url) {
      window.open(order.label_url, "_blank");
      toast.success("Opening shipping label...");
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
                      <div className="flex gap-2 justify-end">
                        {/* Download Label if available */}
                        {order.label_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadLabel(order)}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Download Label
                          </Button>
                        )}

                        {/* Shipping actions */}
                        {order.shipping_status === "pending" && (
                        <Dialog open={showShipModal && selectedOrder?.id === order.id} onOpenChange={(open) => {
                          setShowShipModal(open);
                          if (!open) {
                            setSelectedOrder(null);
                            setTrackingNumber("");
                            setCarrier("");
                            setShippingNote("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowShipModal(true);
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Mark Shipped
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Mark Order as Shipped</DialogTitle>
                              <DialogDescription>
                                Enter shipping details to notify the buyer
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label htmlFor="carrier">Carrier *</Label>
                                <Select value={carrier} onValueChange={setCarrier}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select carrier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USPS">USPS</SelectItem>
                                    <SelectItem value="UPS">UPS</SelectItem>
                                    <SelectItem value="FedEx">FedEx</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="tracking">Tracking Number *</Label>
                                <Input
                                  id="tracking"
                                  value={trackingNumber}
                                  onChange={(e) => setTrackingNumber(e.target.value)}
                                  placeholder={
                                    carrier === "USPS" ? "9400..." :
                                    carrier === "UPS" ? "1Z..." :
                                    carrier === "FedEx" ? "123456789012" :
                                    "Enter tracking number"
                                  }
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {carrier === "USPS" && "20-22 digits or format: XX123456789US"}
                                  {carrier === "UPS" && "18 characters starting with 1Z"}
                                  {carrier === "FedEx" && "12-14 digits"}
                                  {carrier === "Other" && "Minimum 5 characters"}
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="note">Note (Optional)</Label>
                                <Textarea
                                  id="note"
                                  value={shippingNote}
                                  onChange={(e) => setShippingNote(e.target.value)}
                                  placeholder="Add any shipping notes..."
                                  rows={3}
                                />
                              </div>
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Note:</strong> Tracking information will be visible to the buyer. Payout will be released after delivery confirmation.
                                </p>
                              </div>
                              <Button
                                onClick={handleMarkShipped}
                                disabled={updating || !carrier || !trackingNumber}
                                className="w-full"
                              >
                                {updating ? "Saving..." : "Mark as Shipped"}
                              </Button>
                            </div>
                          </DialogContent>
                          </Dialog>
                        )}
                        
                        {order.shipping_status === "shipped" && (
                        <Dialog open={showDeliveryModal && selectedOrder?.id === order.id} onOpenChange={(open) => {
                          setShowDeliveryModal(open);
                          if (!open) {
                            setSelectedOrder(null);
                            setTrackingNumber("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setShowDeliveryModal(true);
                              }}
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
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Current Tracking:</strong> {order.tracking_number}
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                  Confirming delivery will initiate the payout hold period based on your seller tier and transaction value.
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
                      </div>
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