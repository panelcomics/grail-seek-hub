import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmTradePaymentRequest {
  tradeId: string;
  paymentIntentId: string;
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

    const { tradeId, paymentIntentId } = await req.json() as ConfirmTradePaymentRequest;

    // Verify payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      // Mark as payment failed
      const { data: trade } = await supabase
        .from("trades")
        .select("user_a, user_b")
        .eq("id", tradeId)
        .single();

      await supabase
        .from("trades")
        .update({ status: 'payment_failed' })
        .eq("id", tradeId);

      // Notify both users of payment failure
      if (trade) {
        await Promise.all([
          supabase.from("notifications").insert({
            user_id: trade.user_a,
            type: 'trade_payment_failed',
            message: 'Trade payment failed. Please try again.',
            link: `/trades/${tradeId}`
          }),
          supabase.from("notifications").insert({
            user_id: trade.user_b,
            type: 'trade_payment_failed',
            message: 'Trade payment failed. Please try again.',
            link: `/trades/${tradeId}`
          })
        ]);
      }

      return new Response(
        JSON.stringify({ error: "Payment not completed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get trade
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

    const isUserA = trade.user_a === user.id;
    const now = new Date().toISOString();

    // Update payment status
    const updateData = isUserA 
      ? { user_a_paid_at: now }
      : { user_b_paid_at: now };

    await supabase
      .from("trades")
      .update(updateData)
      .eq("id", tradeId);

    // Check if both users have paid
    const { data: updatedTrade } = await supabase
      .from("trades")
      .select("*")
      .eq("id", tradeId)
      .single();

    if (updatedTrade && updatedTrade.user_a_paid_at && updatedTrade.user_b_paid_at) {
      // Both paid, mark trade as completed
      await supabase
        .from("trades")
        .update({ 
          status: 'completed',
          completed_at: now
        })
        .eq("id", tradeId);

      // Get user emails
      const [userAData, userBData] = await Promise.all([
        supabase.auth.admin.getUserById(updatedTrade.user_a),
        supabase.auth.admin.getUserById(updatedTrade.user_b)
      ]);

      const message = `Trade complete! Each trader paid $${updatedTrade.each_user_fee.toFixed(2)} (${(updatedTrade.total_fee / updatedTrade.agreed_value * 100).toFixed(1)}% + $2 split evenly).`;

      // Send notifications to both users
      await Promise.all([
        supabase.from("notifications").insert({
          user_id: updatedTrade.user_a,
          type: 'trade_completed',
          message,
          link: `/trades/${tradeId}`
        }),
        supabase.from("notifications").insert({
          user_id: updatedTrade.user_b,
          type: 'trade_completed',
          message,
          link: `/trades/${tradeId}`
        })
      ]);

      // Send emails if configured
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const authHeader = req.headers.get("Authorization");
      if (resendKey && authHeader && userAData.data.user?.email && userBData.data.user?.email) {
        await Promise.all([
          supabase.functions.invoke('send-notification-email', {
            headers: { Authorization: authHeader },
            body: {
              userId: updatedTrade.user_a,
              message,
              link: `${req.headers.get("origin")}/trades/${tradeId}`,
              type: 'trade_completed'
            }
          }),
          supabase.functions.invoke('send-notification-email', {
            headers: { Authorization: authHeader },
            body: {
              userId: updatedTrade.user_b,
              message,
              link: `${req.headers.get("origin")}/trades/${tradeId}`,
              type: 'trade_completed'
            }
          })
        ]);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in confirm-trade-payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
