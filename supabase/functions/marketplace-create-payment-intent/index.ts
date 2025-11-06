import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { listingId, shipping } = await req.json();

    // Get listing details
    const { data: listing, error: listingError } = await supabaseClient
      .from("listings")
      .select("*, inventory_items!inventory_item_id(*)")
      .eq("id", listingId)
      .eq("status", "active")
      .single();

    if (listingError || !listing) {
      throw new Error("Listing not found or inactive");
    }

    if (listing.quantity < 1) {
      throw new Error("Item out of stock");
    }

    // Get seller's Stripe account
    const { data: sellerProfile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", listing.user_id)
      .single();

    if (!sellerProfile?.stripe_account_id || !sellerProfile.stripe_onboarding_complete) {
      throw new Error("Seller has not completed payout setup");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const amount_cents = listing.price_cents;
    const fee_cents = listing.fee_cents;

    // Create order record
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        amount_cents,
        status: "requires_payment",
        shipping_name: shipping.name,
        shipping_address: shipping,
      })
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Create payment intent with Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      application_fee_amount: fee_cents,
      transfer_data: {
        destination: sellerProfile.stripe_account_id,
      },
      metadata: {
        order_id: order.id,
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: listing.user_id,
      },
    });

    // Update order with payment intent
    await supabaseClient
      .from("orders")
      .update({ 
        stripe_payment_intent: paymentIntent.id,
        payment_intent_id: paymentIntent.id 
      })
      .eq("id", order.id);

    // Log event
    await supabaseClient
      .from("event_logs")
      .insert({
        user_id: user.id,
        event: "checkout_started",
        meta: { order_id: order.id, listing_id: listingId, amount_cents },
      });

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        orderId: order.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
