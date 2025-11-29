import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ==========================================================================
// FEE CONFIGURATION - Must match src/config/feesConfig.ts
// ==========================================================================
const STANDARD_SELLER_FEE_RATE = 0.0375;
const STRIPE_PERCENTAGE_FEE = 0.029;
const STRIPE_FIXED_FEE_CENTS = 30;
// ==========================================================================

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

    const { listingId, shipping, shippoRate } = await req.json();

    // SECURITY: buyer_id is ALWAYS the authenticated user
    // NEVER accept buyer_id from request body - this prevents privilege escalation
    // Only the authenticated user can create payment intents for their own purchases

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

    // Get seller's Stripe account and fee rate
    const { data: sellerProfile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, custom_fee_rate, is_founding_seller")
      .eq("user_id", listing.user_id)
      .single();

    if (!sellerProfile?.stripe_account_id || !sellerProfile.stripe_onboarding_complete) {
      throw new Error("Seller has not completed payout setup");
    }

    // Determine fee rate: use custom_fee_rate if set, otherwise default to standard rate
    const feeRate = sellerProfile.custom_fee_rate ?? STANDARD_SELLER_FEE_RATE;

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("CRITICAL: STRIPE_SECRET_KEY not configured!");
      throw new Error("Payment system configuration error");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const amount_cents = listing.price_cents;
    
    // Calculate platform fee using seller's custom rate
    // Total fee is capped at the seller's rate (e.g., 2% for founding sellers, 3.75% for standard)
    const max_total_fee_cents = Math.round(amount_cents * feeRate);
    const estimated_stripe_fee_cents = Math.round(amount_cents * STRIPE_PERCENTAGE_FEE) + STRIPE_FIXED_FEE_CENTS;
    // Platform gets what's left after Stripe takes their cut
    const platform_fee_cents = Math.max(0, max_total_fee_cents - estimated_stripe_fee_cents);

    // Prepare order data
    const orderData: any = {
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.user_id,
      amount_cents,
      status: "requires_payment",
      shipping_name: shipping.name,
      shipping_address: shipping,
    };

    // Add Shippo data if provided
    if (shippoRate) {
      orderData.shippo_rate_id = shippoRate.rate_id;
      orderData.label_cost_cents = shippoRate.label_cost_cents;
      orderData.shipping_charged_cents = shippoRate.shipping_charged_cents;
      orderData.shipping_margin_cents = shippoRate.shipping_margin_cents;
    }

    // Create order record
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      throw new Error(`Failed to create order: ${orderError.message}`);
    }

    // Create payment intent with Connect
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      application_fee_amount: platform_fee_cents,
      transfer_data: {
        destination: sellerProfile.stripe_account_id,
      },
      metadata: {
        order_id: order.id,
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: listing.user_id,
        max_total_fee_cents: max_total_fee_cents.toString(),
        platform_fee_cents: platform_fee_cents.toString(),
        seller_fee_rate: feeRate.toString(),
        is_founding_seller: sellerProfile.is_founding_seller?.toString() || 'false',
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
    // SECURITY: Log full details server-side only
    console.error("Error creating payment intent:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Provide helpful error messages for specific cases
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let clientError = "Unable to process payment. Please try again later.";
    
    if (errorMessage.includes("Seller has not completed payout setup")) {
      clientError = "This seller hasn't completed their payout setup yet and cannot accept payments. Please contact the seller or try another listing.";
    } else if (errorMessage.includes("Listing not found")) {
      clientError = "This listing is no longer available.";
    } else if (errorMessage.includes("out of stock")) {
      clientError = "This item is currently out of stock.";
    }
    
    return new Response(
      JSON.stringify({ error: clientError }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
