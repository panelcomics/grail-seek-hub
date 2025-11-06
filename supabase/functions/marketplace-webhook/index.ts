import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
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
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return new Response(
      JSON.stringify({ error: "Webhook signature verification failed" }),
      { status: 400, headers: corsHeaders }
    );
  }

  console.log("Webhook event type:", event.type);

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.order_id;

      console.log("Payment succeeded for order:", orderId);

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
      
      // Find order by charge_id
      const { data: order } = await supabaseClient
        .from("orders")
        .select("id")
        .eq("charge_id", charge.id)
        .single();

      if (order) {
        await supabaseClient
          .from("orders")
          .update({ status: "refunded" })
          .eq("id", order.id);
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
