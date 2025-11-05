import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface TradeConfirmationProps {
  tradeId: string;
  agreedValue: number;
  onComplete?: () => void;
}

function PaymentForm({ tradeId, onSuccess }: { tradeId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (submitError) {
        setError(submitError.message || "Payment failed");
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Confirm payment on backend
        const { error: confirmError } = await supabase.functions.invoke('confirm-trade-payment', {
          body: { tradeId, paymentIntentId: paymentIntent.id }
        });

        if (confirmError) throw confirmError;

        toast.success("Payment successful!");
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={!stripe || processing} className="w-full">
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Pay Trade Fee"
        )}
      </Button>
    </form>
  );
}

export function TradeConfirmation({ tradeId, agreedValue, onComplete }: TradeConfirmationProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [feeSettings, setFeeSettings] = useState<any>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [noFeesRequired, setNoFeesRequired] = useState(false);

  useEffect(() => {
    loadFeeSettings();
    checkPaymentStatus();
  }, [tradeId]);

  const loadFeeSettings = async () => {
    const { data } = await supabase
      .from("trade_fee_settings")
      .select("*")
      .single();

    if (data) {
      setFeeSettings(data);
      const totalFee = (agreedValue * data.percentage_fee) + data.flat_fee;
      const eachFee = totalFee / 2;
      setFeeAmount(eachFee);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: trade } = await supabase
        .from("trades")
        .select("*")
        .eq("id", tradeId)
        .single();

      if (!trade) return;

      const isUserA = trade.user_a === user.id;
      const hasPaid = isUserA ? trade.user_a_paid_at : trade.user_b_paid_at;

      if (hasPaid) {
        setAlreadyPaid(true);
        setLoading(false);
        return;
      }

      // Create payment intent
      const { data, error } = await supabase.functions.invoke('process-trade-payment', {
        body: { tradeId }
      });

      if (error) throw error;

      if (data.noFeesRequired) {
        setNoFeesRequired(true);
        setLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setFeeAmount(data.amount);
    } catch (error) {
      console.error("Error checking payment status:", error);
      toast.error("Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/trades');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (alreadyPaid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Payment Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You've already paid your share of the trade fee. Waiting for the other trader to complete their payment.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (noFeesRequired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Fee Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Trade fees are currently disabled. Your trade is being processed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!feeSettings?.fees_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Trade fees are currently disabled. Click confirm to proceed.
          </p>
          <Button onClick={handlePaymentSuccess} className="mt-4 w-full">
            Confirm Trade
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Trade</CardTitle>
        <CardDescription>
          Grail Seeker fee: {(feeSettings.percentage_fee * 100)}% + ${feeSettings.flat_fee} (split evenly)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Agreed Trade Value:</span>
            <span className="font-medium">${agreedValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Fee:</span>
            <span className="font-medium">${(feeAmount * 2).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Your Fee (50%):</span>
            <span>${feeAmount.toFixed(2)}</span>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            Both traders must pay their share before the trade is finalized.
          </AlertDescription>
        </Alert>

        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm tradeId={tradeId} onSuccess={handlePaymentSuccess} />
          </Elements>
        )}
      </CardContent>
    </Card>
  );
}
