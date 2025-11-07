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
    const { orderId } = await req.json();

    if (!orderId) {
      throw new Error("Order ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Processing refund for order:", orderId);

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("id, total, charge_id, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.payment_status !== "paid") {
      throw new Error("Order has not been paid yet");
    }

    if (!order.charge_id) {
      throw new Error("No charge ID found for this order");
    }

    // Calculate refund amount (total minus Stripe fee: 2.9% + $0.30)
    const totalCents = Math.round(order.total * 100);
    const stripeFee = Math.round(totalCents * 0.029 + 30);
    const refundAmountCents = totalCents - stripeFee;

    console.log("Refund calculation:", {
      totalCents,
      stripeFee,
      refundAmountCents,
      refundAmountDollars: refundAmountCents / 100
    });

    // Process refund through Stripe with explicit amount
    const refund = await stripe.refunds.create({
      charge: order.charge_id,
      amount: refundAmountCents, // Refund amount minus Stripe processing fee
      reason: "requested_by_customer",
      metadata: {
        order_id: orderId,
        stripe_fee_withheld: stripeFee,
      }
    });

    console.log("Refund processed:", {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount
    });

    // Update order status
    await supabaseClient
      .from("orders")
      .update({
        status: "refunded",
        refund_amount: refundAmountCents / 100,
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        refundId: refund.id,
        refundAmount: refundAmountCents / 100,
        stripeFeeWithheld: stripeFee / 100,
        message: `Refund of $${(refundAmountCents / 100).toFixed(2)} processed. Processing fee of $${(stripeFee / 100).toFixed(2)} has been withheld.`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing refund:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to process refund"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
