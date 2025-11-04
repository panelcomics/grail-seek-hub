import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreatePaymentIntentRequest {
  orderId: string;
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

    const { orderId } = await req.json() as CreatePaymentIntentRequest;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: "orderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, amount, shipping_amount, buyer_protection_fee, seller_id, buyer_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate fees
    const protectionFee = order.buyer_protection_fee || 1.99;
    const platformFeeRate = 0.035; // 3.5%
    const platformFeeAmount = Math.round((order.amount + order.shipping_amount) * platformFeeRate * 100) / 100;
    const total = order.amount + order.shipping_amount + protectionFee;
    
    // Update order with calculated fees
    await supabase
      .from("orders")
      .update({ 
        platform_fee_amount: platformFeeAmount,
      })
      .eq("id", order.id);

    // Get seller's Stripe account
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", order.seller_id)
      .single();

    if (!sellerProfile?.stripe_account_id || !sellerProfile?.stripe_onboarding_complete) {
      return new Response(
        JSON.stringify({ error: "Seller has not completed Stripe onboarding" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get buyer email and seller tier
    const { data: { user: buyer } } = await supabase.auth.admin.getUserById(order.buyer_id);
    
    const { data: sellerData } = await supabase
      .from("profiles")
      .select("completed_sales_count")
      .eq("user_id", order.seller_id)
      .single();

    const completedSales = sellerData?.completed_sales_count || 0;
    
    // Calculate payout hold based on seller tier
    const now = new Date();
    let payoutHoldHours = 72; // Default: 3 days for new sellers
    
    if (completedSales >= 10) {
      payoutHoldHours = 24; // Verified sellers: 24 hours
    }
    
    // High-value transactions get extended hold
    if (total > 1000) {
      payoutHoldHours = 120; // 5 days (48h dispute window + delivery time)
    }

    // Create payment intent with application fee
    const applicationFeeAmount = Math.round((platformFeeAmount + protectionFee) * 100); // Convert to cents
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: "usd",
      application_fee_amount: applicationFeeAmount,
      metadata: {
        order_id: order.id,
        buyer_id: order.buyer_id,
        seller_id: order.seller_id,
        platform_fee: platformFeeAmount.toFixed(2),
        protection_fee: protectionFee.toFixed(2),
      },
      receipt_email: buyer?.email,
      transfer_data: {
        destination: sellerProfile.stripe_account_id,
      },
      on_behalf_of: sellerProfile.stripe_account_id,
    });

    // Set payout hold
    const payoutHoldUntil = new Date(now.getTime() + payoutHoldHours * 60 * 60 * 1000);

    // Update order with payment intent ID and payout hold
    await supabase
      .from("orders")
      .update({ 
        payment_intent_id: paymentIntent.id,
        stripe_session_id: paymentIntent.id, // For compatibility
        payout_hold_until: payoutHoldUntil.toISOString(),
        payout_status: 'held',
      })
      .eq("id", order.id);

    console.log(`Created payment intent ${paymentIntent.id} for order ${order.id}`);

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-payment-intent:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});