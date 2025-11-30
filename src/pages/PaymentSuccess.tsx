import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const orderId = searchParams.get("order_id");
  const paymentIntent = searchParams.get("payment_intent");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!orderId || !paymentIntent) {
        console.error("[PAYMENT-SUCCESS] Missing required params:", { orderId, paymentIntent });
        toast.error("Invalid payment confirmation");
        navigate("/orders");
        return;
      }

      console.log("[PAYMENT-SUCCESS] Starting payment verification:", { orderId, paymentIntent });

      try {
        // First, verify the order exists and get current state
        const { data: existingOrder, error: fetchError } = await supabase
          .from("orders")
          .select("*, listing:listing_id(user_id)")
          .eq("id", orderId)
          .single();

        if (fetchError) {
          console.error("[PAYMENT-SUCCESS] Failed to fetch order:", fetchError);
          throw new Error("Failed to load order");
        }

        console.log("[PAYMENT-SUCCESS] Order found:", {
          orderId: existingOrder.id,
          currentStatus: existingOrder.payment_status,
          payment_intent_id: existingOrder.payment_intent_id,
          expected_payment_intent: paymentIntent
        });

        // Update order status to paid
        const { data: order, error: orderUpdateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .eq("payment_intent_id", paymentIntent)
          .select("*, listing:listing_id(user_id)")
          .single();

        if (orderUpdateError) {
          console.error("[PAYMENT-SUCCESS] Failed to update order:", orderUpdateError);
          throw orderUpdateError;
        }

        console.log("[PAYMENT-SUCCESS] Order updated successfully:", {
          orderId: order.id,
          payment_status: order.payment_status
        });

        // If order has Shippo rate, generate label automatically
        if (order.shippo_rate_id && order.label_cost_cents) {
          console.log("Generating shipping label...");
          try {
            const { error: labelError } = await supabase.functions.invoke(
              "purchase-shipping-label",
              {
                body: {
                  orderId: order.id,
                  rateId: order.shippo_rate_id,
                  labelCostCents: order.label_cost_cents,
                  shippingChargedCents: order.shipping_charged_cents,
                  shippingMarginCents: order.shipping_margin_cents,
                },
              }
            );

            if (labelError) {
              console.error("Failed to generate label:", labelError);
              // Don't fail the whole payment, just log it
            } else {
              console.log("Label generated successfully!");
            }
          } catch (labelError) {
            console.error("Label generation error:", labelError);
            // Don't fail the payment
          }
        }

        toast.success("Payment successful!");
      } catch (error: any) {
        console.error("[PAYMENT-SUCCESS] Error verifying payment:", {
          error: error?.message || error,
          orderId,
          paymentIntent,
          timestamp: new Date().toISOString()
        });
        
        const errorMessage = error?.message?.includes("Failed to load order")
          ? "Failed to load order"
          : "Payment verification failed. Please contact support.";
        
        toast.error(errorMessage);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [orderId, paymentIntent, navigate]);

  if (isVerifying) {
    return (
      <AppLayout>
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your payment has been processed successfully. The seller will be notified to ship your item.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate(`/order/${orderId}`)}>
                View Order Details
              </Button>
              <Button variant="outline" onClick={() => navigate("/orders")}>
                My Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </AppLayout>
  );
};

export default PaymentSuccess;
