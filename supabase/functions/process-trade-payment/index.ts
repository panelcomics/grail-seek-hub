import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FEE_THRESHOLD = 150;

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

    // Get fee settings
    const { data: feeSettings } = await supabase
      .from("trade_fee_settings")
      .select("*")
      .single();

    // Check if fees should be applied
    const shouldChargeFee = feeSettings?.fees_enabled && trade.agreed_value >= FEE_THRESHOLD;

    if (!shouldChargeFee) {
      // No fees required - mark as paid
      const updateData = isUserA 
        ? { 
            user_a_paid_at: new Date().toISOString(),
            total_fee: 0,
            each_user_fee: 0
          }
        : { 
            user_b_paid_at: new Date().toISOString(),
            total_fee: 0,
            each_user_fee: 0
          };

      await supabase
        .from("trades")
        .update(updateData)
        .eq("id", tradeId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          noFeesRequired: true,
          reason: trade.agreed_value < FEE_THRESHOLD 
            ? `Trade value under $${FEE_THRESHOLD} threshold` 
            : "Fees disabled"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fees (rounded to 2 decimals)
    const totalFee = Number(((trade.agreed_value * feeSettings.percentage_fee) + feeSettings.flat_fee).toFixed(2));
    const eachUserFee = Number((totalFee / 2).toFixed(2));

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
      description: `Grail Seeker Trade Fee – Split 50/50 (${feeSettings.percentage_fee * 100}% + $${feeSettings.flat_fee})`,
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
