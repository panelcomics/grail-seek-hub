import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Trade fee tiers based on total trade value (item_a + item_b)
const TRADE_FEE_TIERS = [
  { min: 0, max: 50, total: 2, each: 1 },
  { min: 51, max: 100, total: 5, each: 2.5 },
  { min: 101, max: 250, total: 12, each: 6 },
  { min: 251, max: 500, total: 22, each: 11 },
  { min: 501, max: 1000, total: 35, each: 17.5 },
  { min: 1001, max: 2000, total: 45, each: 22.5 },
  { min: 2001, max: 4000, total: 55, each: 27.5 },
  { min: 4001, max: 5000, total: 60, each: 30 },
  { min: 5001, max: 10000, total: 200, each: 100 },
  { min: 10001, max: Infinity, total: 200, each: 100 },
];

function calculateTradeFee(totalTradeValue: number) {
  const tier = TRADE_FEE_TIERS.find(
    t => totalTradeValue >= t.min && totalTradeValue <= t.max
  );
  
  return tier || TRADE_FEE_TIERS[TRADE_FEE_TIERS.length - 1];
}

interface ProcessTradePaymentRequest {
  tradeId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tradeId } = await req.json() as ProcessTradePaymentRequest;

    if (!tradeId) {
      return new Response(
        JSON.stringify({ error: "tradeId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get trade details
    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .select("*")
      .eq("id", tradeId)
      .single();

    if (tradeError || !trade) {
      return new Response(
        JSON.stringify({ error: "Trade not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is part of this trade
    if (trade.user_a !== user.id && trade.user_b !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized for this trade" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already paid
    const isUserA = trade.user_a === user.id;
    if ((isUserA && trade.user_a_paid_at) || (!isUserA && trade.user_b_paid_at)) {
      return new Response(
        JSON.stringify({ error: "You have already paid for this trade" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fees based on tiered structure
    const feeCalc = calculateTradeFee(trade.agreed_value);
    const totalFee = feeCalc.total;
    const eachUserFee = feeCalc.each;

    // Check if fees should be charged (tier 0 = free)
    if (totalFee === 0) {
      return new Response(
        JSON.stringify({ error: "All trades now require a minimum fee. Please contact support if you believe this is an error." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update trade with fee amounts if not set
    if (!trade.total_fee) {
      await supabase
        .from("trades")
        .update({ 
          total_fee: totalFee,
          each_user_fee: eachUserFee,
          status: 'payment_processing'
        })
        .eq("id", tradeId);
    }

    // Get user's Stripe customer or create one
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
    const email = authUser?.email;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(eachUserFee * 100), // Convert to cents
      currency: "usd",
      metadata: {
        trade_id: tradeId,
        user_id: user.id,
        is_user_a: isUserA.toString(),
      },
      description: `Grail Seeker Trade Fee – $${totalFee} total ($${eachUserFee} each)`,
      receipt_email: email,
    });

    // Update trade with payment intent
    const paymentIntentField = isUserA ? 'user_a_payment_intent' : 'user_b_payment_intent';
    await supabase
      .from("trades")
      .update({ [paymentIntentField]: paymentIntent.id })
      .eq("id", tradeId);

    console.log(`Created payment intent ${paymentIntent.id} for trade ${tradeId}, user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: eachUserFee,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-trade-payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
