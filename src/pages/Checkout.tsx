import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!STRIPE_PUBLISHABLE_KEY) {
  console.error('CRITICAL: VITE_STRIPE_PUBLISHABLE_KEY not configured!');
}

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const CheckoutForm = ({ orderId }: { orderId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?order_id=${orderId}`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay Now"
        )}
      </Button>
    </form>
  );
};

const Checkout = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    if (!user || !orderId) {
      navigate("/auth");
      return;
    }

    const fetchOrderAndCreatePaymentIntent = async () => {
      try {
        // Fetch order details
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select(`
            *,
            claim_sales (
              title,
              seller_id
            )
          `)
          .eq("id", orderId)
          .eq("buyer_id", user.id)
          .single();

        if (orderError || !order) {
          toast.error("Order not found");
          navigate("/my-orders");
          return;
        }

        setOrderDetails(order);

        // Check if payment already completed
        if (order.payment_status === "paid") {
          toast.info("This order has already been paid");
          navigate(`/order/${orderId}`);
          return;
        }

        // Create payment intent
        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { orderId },
        });

        if (error) throw error;

        setClientSecret(data.clientSecret);
      } catch (error: any) {
        console.error("Error setting up payment:", error);
        toast.error(error.message || "Failed to load payment form");
        navigate("/my-orders");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderAndCreatePaymentIntent();
  }, [orderId, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {orderDetails && (
              <>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item:</span>
                    <span className="font-medium">{orderDetails.claim_sales?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-bold text-lg">
                      ${orderDetails.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>Flat 6.5% selling fee (including payment processing). No extra percentage fees.</strong> Our cut comes out of that, not on top of it. Trades use separate fee tiers.
                  </p>
                </div>
              </>
            )}

            {clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                  },
                }}
              >
                <CheckoutForm orderId={orderId!} />
              </Elements>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Checkout;
