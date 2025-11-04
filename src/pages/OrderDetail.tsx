import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, DollarSign, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Separator } from "@/components/ui/separator";
import { useTerms } from "@/hooks/useTerms";
import { TermsPopup } from "@/components/TermsPopup";

interface Order {
  id: string;
  amount: number;
  shipping_amount: number;
  buyer_protection_fee: number;
  platform_fee_amount: number;
  total: number;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  paid_at: string | null;
  claim_sale_id: string;
  tracking_number: string | null;
  carrier: string | null;
  shipping_status: string;
  shipped_at: string | null;
}

interface ClaimSale {
  title: string;
  description: string;
  city: string;
  state: string;
}

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showTermsPopup, requireTerms, handleAcceptTerms, handleDeclineTerms } = useTerms();
  const [order, setOrder] = useState<Order | null>(null);
  const [sale, setSale] = useState<ClaimSale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast.error("Please sign in to view orders");
      navigate("/auth");
      return;
    }
    fetchOrder();
  }, [user, id, navigate]);

  const fetchOrder = async () => {
    try {
      setIsLoading(true);

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("buyer_id", user?.id)
        .single();

      if (orderError) throw orderError;
      if (!orderData) {
        toast.error("Order not found");
        navigate("/profile");
        return;
      }

      setOrder(orderData as Order);

      // Fetch related claim sale
      const { data: saleData, error: saleError } = await supabase
        .from("claim_sales")
        .select("title, description, city, state")
        .eq("id", orderData.claim_sale_id)
        .single();

      if (saleError) throw saleError;
      setSale(saleData as ClaimSale);
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to load order");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <p className="text-center text-muted-foreground">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order || !sale) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-12 px-4">
          <p className="text-center text-muted-foreground">Order not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate("/profile")}>
            ← Back to Profile
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                <CardDescription>
                  {new Date(order.created_at).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge
                variant={
                  order.payment_status === "paid"
                    ? "default"
                    : order.payment_status === "pending"
                    ? "secondary"
                    : "outline"
                }
              >
                {order.payment_status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">{sale.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {sale.city}, {sale.state}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Item Price</span>
                  </div>
                  <span className="font-semibold">${order.amount.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Shipping</span>
                  </div>
                  <span className="font-semibold">${order.shipping_amount.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${(order.amount + order.shipping_amount).toFixed(2)}</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm">Buyer Protection</span>
                  </div>
                  <span className="font-semibold text-primary">${order.buyer_protection_fee.toFixed(2)}</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-lg">Total</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    ${order.total.toFixed(2)}
                  </span>
                </div>
                
                {order.platform_fee_amount && (
                  <p className="text-xs text-muted-foreground text-right">
                    Platform fee: ${order.platform_fee_amount.toFixed(2)}
                  </p>
                )}
              </div>

              {order.payment_status === "pending" && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    The seller will send you payment instructions shortly. Please check your email or contact the seller directly.
                  </p>
                </div>
              )}

              {order.payment_status === "paid" && order.paid_at && (
                <div className="mt-6 p-4 bg-success/10 border border-success rounded-lg">
                  <p className="text-sm font-semibold text-success">
                    ✓ Payment received on {new Date(order.paid_at).toLocaleDateString()}
                  </p>
                  {order.payment_method && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Payment method: {order.payment_method}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tracking Information */}
        {order.tracking_number && order.carrier && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Carrier</p>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {order.carrier === "USPS" && "🇺🇸"}
                        {order.carrier === "UPS" && "📦"}
                        {order.carrier === "FedEx" && "✈️"}
                        {order.carrier === "Other" && "🚚"}
                      </span>
                      <span className="text-lg font-semibold">{order.carrier}</span>
                    </div>
                  </div>
                  <Badge variant={order.shipping_status === "delivered" ? "default" : "secondary"}>
                    {order.shipping_status === "shipped" && "In Transit"}
                    {order.shipping_status === "delivered" && "Delivered"}
                    {order.shipping_status === "pending" && "Pending"}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Tracking Number</p>
                  <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                    {order.tracking_number}
                  </p>
                </div>

                {order.shipped_at && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Shipped Date</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.shipped_at).toLocaleDateString()} at {new Date(order.shipped_at).toLocaleTimeString()}
                    </p>
                  </div>
                )}

                {order.carrier !== "Other" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      const trackingUrl = 
                        order.carrier === "USPS" 
                          ? `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`
                          : order.carrier === "UPS"
                          ? `https://www.ups.com/track?tracknum=${order.tracking_number}`
                          : `https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`;
                      window.open(trackingUrl, "_blank");
                    }}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Track Package
                  </Button>
                )}

                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-xs text-center font-semibold">
                    🛡️ Protected by Grail Seeker
                  </p>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Your purchase is covered by buyer protection
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Claim Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {sale.description}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Terms Popup */}
      <TermsPopup
        open={showTermsPopup}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    </div>
  );
};

export default OrderDetail;
