import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

// Trade fee tiers
const TRADE_FEE_TIERS = [
  { min: 0, max: 199.99, total: 0, each: 0, label: "$0-199.99: Free" },
  { min: 200, max: 400, total: 4, each: 2, label: "$200-400: $4 total ($2 each)" },
  { min: 401, max: 999, total: 8, each: 4, label: "$401-999: $8 total ($4 each)" },
  { min: 1000, max: 1999, total: 20, each: 10, label: "$1000-1999: $20 total ($10 each)" },
  { min: 2000, max: 3999, total: 25, each: 12.5, label: "$2000-3999: $25 total ($12.50 each)" },
  { min: 4000, max: Infinity, total: 35, each: 17.5, label: "$4000+: $35 total ($17.50 each)" },
];

function calculateTradeFee(totalTradeValue: number) {
  const tier = TRADE_FEE_TIERS.find(
    t => totalTradeValue >= t.min && totalTradeValue <= t.max
  );
  return tier || TRADE_FEE_TIERS[TRADE_FEE_TIERS.length - 1];
}

const tradeConfirmationSchema = z.object({
  agreedValue: z.number().positive().min(0.01, "Trade value must be at least $0.01"),
  agreedToFee: z.boolean().refine((val) => val === true, {
    message: "You must agree to the fee to proceed"
  })
});

interface TradeConfirmationProps {
  tradeId: string;
  agreedValue: number;
  onComplete?: () => void;
}

function PaymentForm({ tradeId, onSuccess, disabled }: { 
  tradeId: string; 
  onSuccess: () => void;
  disabled: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || disabled) {
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
      <Button 
        type="submit" 
        disabled={!stripe || processing || disabled} 
        className="w-full" 
        size="lg"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Pay Trade Fee
          </>
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
  const [totalFee, setTotalFee] = useState<number>(0);
  const [feeSettings, setFeeSettings] = useState<any>(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [noFeesRequired, setNoFeesRequired] = useState(false);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const tradeFee = calculateTradeFee(agreedValue);
  const isFree = tradeFee.total === 0;

  useEffect(() => {
    // Validate agreed value
    try {
      tradeConfirmationSchema.parse({ 
        agreedValue, 
        agreedToFee: true // Just validating value here
      });
      setValidationError(null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        setValidationError(issues[0]?.message || "Validation error");
      }
    }
    
    loadFeeSettings();
    checkPaymentStatus();
  }, [tradeId, agreedValue]);

  const loadFeeSettings = async () => {
    // Calculate fees based on tiered structure
    setTotalFee(tradeFee.total);
    setFeeAmount(tradeFee.each);
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
    // Validate before proceeding
    try {
      tradeConfirmationSchema.parse({ agreedValue, agreedToFee });
      
      if (onComplete) {
        onComplete();
      } else {
        navigate('/trades');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        toast.error(issues[0]?.message || "Validation error");
      }
    }
  };

  const handleConfirmTrade = async () => {
    // Validate checkbox
    try {
      tradeConfirmationSchema.parse({ agreedValue, agreedToFee });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues;
        toast.error(issues[0]?.message || "Validation error");
        return;
      }
    }

    // If free tier or no fees, complete without payment
    if (isFree || noFeesRequired) {
      handlePaymentSuccess();
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

  if (validationError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Invalid Trade Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
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

  if (noFeesRequired && !isFree) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete Your Trade</CardTitle>
        <CardDescription>
          Review the fee details and confirm your trade
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trade Fee Summary Box */}
        <Card className="bg-muted/50 border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Trade Fee Summary</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      {tradeFee.label}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-muted-foreground">Trade Value:</span>
                <span className="font-semibold">${agreedValue.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm sm:text-base">
                <span className="text-muted-foreground">Grail Seeker Fee:</span>
                <div className="text-right">
                  <span className="font-semibold">
                    {isFree ? "$0.00" : `$${totalFee.toFixed(2)}`}
                  </span>
                  {isFree && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Low Flat Trade Fees — No Surprises
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-base sm:text-lg font-bold pt-3 border-t">
                <span>Your Share (split 50/50):</span>
                <span className="text-primary">${feeAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <a 
                href="/fees" 
                className="text-xs sm:text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                View Fee Policy →
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Checkbox */}
        <div className="flex items-start space-x-3 rounded-lg border p-4">
          <Checkbox
            id="agree-fee"
            checked={agreedToFee}
            onCheckedChange={(checked) => setAgreedToFee(checked === true)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="agree-fee"
              className="text-sm font-medium leading-relaxed cursor-pointer"
            >
              I understand my fee is ${feeAmount.toFixed(2)} and agree to proceed.
            </Label>
            <p className="text-xs text-muted-foreground">
              Both traders must complete payment before the trade is finalized.
            </p>
          </div>
        </div>

        <Alert>
          <AlertDescription className="text-xs sm:text-sm">
            {isFree ? (
              <span className="text-green-600 font-medium">
                ✓ Low Flat Trade Fees — No Surprises
              </span>
            ) : (
              "Both traders must pay their share before the trade is finalized."
            )}
          </AlertDescription>
        </Alert>

        {/* Payment or Confirmation */}
        {!isFree && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm tradeId={tradeId} onSuccess={handlePaymentSuccess} disabled={!agreedToFee} />
          </Elements>
        ) : (
          <Button 
            onClick={handleConfirmTrade} 
            disabled={!agreedToFee} 
            className="w-full"
            size="lg"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirm Trade
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
