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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BundleCheckoutRequest {
  listingIds: string[];
  shipping: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

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

    const { listingIds, shipping } = await req.json() as BundleCheckoutRequest;

    if (!listingIds || listingIds.length === 0) {
      throw new Error("No listings provided for bundle checkout");
    }

    console.log("[BUNDLE-CHECKOUT] Starting bundle checkout:", {
      buyer_id: user.id,
      listing_count: listingIds.length,
      listingIds
    });

    // Fetch all listings
    const { data: listings, error: listingsError } = await supabaseClient
      .from("listings")
      .select("*, inventory_items!inventory_item_id(*)")
      .in("id", listingIds)
      .eq("status", "active");

    if (listingsError || !listings || listings.length === 0) {
      throw new Error("One or more listings not found or inactive");
    }

    // Verify all listings are from the same seller
    const sellerIds = new Set(listings.map((l: any) => l.user_id));
    if (sellerIds.size > 1) {
      throw new Error("Bundle checkout only supports items from the same seller");
    }

    const sellerId = listings[0].user_id;

    // Check all items are in stock
    for (const listing of listings) {
      if (listing.quantity < 1) {
        throw new Error(`Item "${listing.inventory_items?.title || listing.id}" is out of stock`);
      }
    }

    // Get seller's Stripe account and fee rate
    const { data: sellerProfile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, custom_fee_rate, is_founding_seller")
      .eq("user_id", sellerId)
      .single();

    if (!sellerProfile?.stripe_account_id || !sellerProfile.stripe_onboarding_complete) {
      throw new Error("Seller has not completed payout setup");
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("CRITICAL: STRIPE_SECRET_KEY not configured!");
      throw new Error("Payment system configuration error");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Determine fee rate
    const feeRate = sellerProfile.custom_fee_rate ?? STANDARD_SELLER_FEE_RATE;

    // Calculate totals
    let totalItemsCents = 0;
    let maxShippingCents = 0; // Use highest shipping as base for bundle

    for (const listing of listings) {
      totalItemsCents += listing.price_cents || 0;
      const shippingCents = Math.round((listing.shipping_price || 0) * 100);
      if (shippingCents > maxShippingCents) {
        maxShippingCents = shippingCents;
      }
    }

    // Bundle shipping: base shipping + $1 per additional item
    const additionalItemsCount = listings.length - 1;
    const bundleShippingCents = maxShippingCents + (additionalItemsCount * 100);
    const totalAmountCents = totalItemsCents + bundleShippingCents;

    // Calculate platform fee on total
    const max_total_fee_cents = Math.round(totalAmountCents * feeRate);
    const estimated_stripe_fee_cents = Math.round(totalAmountCents * STRIPE_PERCENTAGE_FEE) + STRIPE_FIXED_FEE_CENTS;
    const platform_fee_cents = Math.max(0, max_total_fee_cents - estimated_stripe_fee_cents);

    // Generate a bundle group ID
    const bundleGroupId = crypto.randomUUID();

    // Create order records for each listing
    const orderIds: string[] = [];
    
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      // First item gets the full shipping, rest get $0 (bundled)
      const itemShippingCents = i === 0 ? bundleShippingCents : 0;
      
      const orderData = {
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: sellerId,
        amount_cents: listing.price_cents + itemShippingCents,
        status: "requires_payment",
        shipping_name: shipping.name,
        shipping_address: shipping,
        bundle_group_id: bundleGroupId,
      };

      const { data: order, error: orderError } = await supabaseClient
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("[BUNDLE-CHECKOUT] Failed to create order:", orderError);
        throw new Error(`Failed to create order for listing ${listing.id}: ${orderError.message}`);
      }

      orderIds.push(order.id);
    }

    console.log("[BUNDLE-CHECKOUT] Created orders:", { orderIds, bundleGroupId });

    // Create single payment intent for entire bundle
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: "usd",
      application_fee_amount: platform_fee_cents,
      transfer_data: {
        destination: sellerProfile.stripe_account_id,
      },
      metadata: {
        bundle_group_id: bundleGroupId,
        order_ids: orderIds.join(","),
        listing_ids: listingIds.join(","),
        buyer_id: user.id,
        seller_id: sellerId,
        item_count: listings.length.toString(),
        total_items_cents: totalItemsCents.toString(),
        bundle_shipping_cents: bundleShippingCents.toString(),
        platform_fee_cents: platform_fee_cents.toString(),
        seller_fee_rate: feeRate.toString(),
        is_founding_seller: sellerProfile.is_founding_seller?.toString() || 'false',
      },
    });

    // Update all orders with the shared payment intent ID
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({ payment_intent_id: paymentIntent.id })
      .in("id", orderIds);

    if (updateError) {
      console.error("[BUNDLE-CHECKOUT] Failed to update orders with payment_intent_id:", updateError);
      throw new Error(`Failed to link payment intent to orders: ${updateError.message}`);
    }

    // Update cart items with bundle_group_id for tracking
    await supabaseClient
      .from("cart_items")
      .update({ bundle_group_id: bundleGroupId })
      .eq("user_id", user.id)
      .in("listing_id", listingIds);

    console.log("[BUNDLE-CHECKOUT] Successfully created bundle payment intent:", {
      bundleGroupId,
      paymentIntentId: paymentIntent.id,
      totalAmountCents,
      itemCount: listings.length
    });

    // Log event
    await supabaseClient
      .from("event_logs")
      .insert({
        user_id: user.id,
        event: "bundle_checkout_started",
        meta: { 
          bundle_group_id: bundleGroupId,
          order_ids: orderIds,
          listing_ids: listingIds, 
          total_amount_cents: totalAmountCents,
          item_count: listings.length
        },
      });

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        bundleGroupId,
        orderIds,
        totalAmountCents,
        bundleShippingCents,
        itemCount: listings.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in bundle checkout:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let clientError = errorMessage || "Unable to process bundle checkout. Please try again later.";
    
    if (errorMessage.includes("Seller has not completed payout setup")) {
      clientError = "This seller hasn't completed their payout setup yet and cannot accept payments.";
    } else if (errorMessage.includes("not found or inactive")) {
      clientError = "One or more items are no longer available.";
    } else if (errorMessage.includes("out of stock")) {
      clientError = errorMessage;
    } else if (errorMessage.includes("same seller")) {
      clientError = "Bundle checkout only works for items from the same seller.";
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
