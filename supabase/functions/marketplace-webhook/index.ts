import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ==========================================================================
// FEE CONFIGURATION - Must match src/config/feesConfig.ts
// ==========================================================================
const STRIPE_PERCENTAGE_FEE = 0.029;
const STRIPE_FIXED_FEE_CENTS = 30;
// ==========================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    console.error("CRITICAL: STRIPE_SECRET_KEY not configured!");
    return new Response(
      JSON.stringify({ error: "Payment system configuration error" }),
      { status: 500, headers: corsHeaders }
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    // CRITICAL: Always require webhook signature verification
    if (!webhookSecret) {
      console.error("CRITICAL: STRIPE_WEBHOOK_SECRET not configured!");
      return new Response(
        JSON.stringify({ error: "Webhook configuration error" }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: corsHeaders }
      );
    }

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new Response(
      JSON.stringify({ error: "Webhook signature verification failed" }),
      { status: 400, headers: corsHeaders }
    );
  }

  console.log("[WEBHOOK] Received event type:", event.type);

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.order_id;

      console.log("[WEBHOOK] Payment succeeded for order:", orderId);

      // Update order
      await supabaseClient
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          charge_id: paymentIntent.latest_charge,
        })
        .eq("id", orderId);

      // Get order to update listing
      const { data: order } = await supabaseClient
        .from("orders")
        .select("*, listings(*)")
        .eq("id", orderId)
        .single();

      if (order?.listing_id) {
        const listing = order.listings;

        // Update listing quantity and status
        const newQuantity = listing.quantity - 1;
        await supabaseClient
          .from("listings")
          .update({
            quantity: newQuantity,
            status: newQuantity === 0 ? "sold" : "active",
          })
          .eq("id", order.listing_id);

        // Create notifications
        await supabaseClient
          .from("notifications")
          .insert([
            {
              user_id: order.buyer_id,
              type: "order_confirmed",
              payload: { 
                order_id: orderId, 
                listing_id: order.listing_id,
                message: "Your order has been confirmed!"
              },
            },
            {
              user_id: listing.user_id,
              type: "item_sold",
              payload: { 
                order_id: orderId, 
                listing_id: order.listing_id,
                message: "Your item has been sold!"
              },
            },
          ]);

        // Log event
        await supabaseClient
          .from("event_logs")
          .insert({
            user_id: order.buyer_id,
            event: "payment_succeeded",
            meta: { order_id: orderId, listing_id: order.listing_id },
          });
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      
      // Calculate Stripe processing fee using central config
      const originalAmount = charge.amount; // in cents
      const stripeFee = Math.round(originalAmount * STRIPE_PERCENTAGE_FEE) + STRIPE_FIXED_FEE_CENTS;
      const refundAmount = charge.amount_refunded; // Amount actually refunded (in cents)
      
      console.log("[WEBHOOK] Refund details:", {
        originalAmount,
        stripeFee,
        refundAmount,
        chargeId: charge.id
      });
      
      // Find order by charge_id
      const { data: order } = await supabaseClient
        .from("orders")
        .select("id, total")
        .eq("charge_id", charge.id)
        .single();

      if (order) {
        await supabaseClient
          .from("orders")
          .update({ 
            status: "refunded",
            refund_amount: refundAmount / 100 // Store in dollars
          })
          .eq("id", order.id);
        
        console.log("[WEBHOOK] Order refunded:", {
          orderId: order.id,
          refundAmountDollars: refundAmount / 100
        });
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
