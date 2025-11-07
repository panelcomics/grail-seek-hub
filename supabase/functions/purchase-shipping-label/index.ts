import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { orderId, rateId, labelCostCents, shippingChargedCents, shippingMarginCents } = await req.json();

    console.log("Purchasing shipping label for order:", orderId);

    // Verify order exists and has been paid
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*, listing:listing_id(user_id)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Only allow label purchase for paid orders
    if (order.payment_status !== "paid") {
      throw new Error("Order must be paid before purchasing label");
    }

    const shippoApiKey = Deno.env.get("SHIPPO_API_KEY");
    if (!shippoApiKey) {
      throw new Error("SHIPPO_API_KEY not configured");
    }

    // Purchase the label via Shippo
    const transactionResponse = await fetch("https://api.goshippo.com/transactions/", {
      method: "POST",
      headers: {
        "Authorization": `ShippoToken ${shippoApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rate: rateId,
        label_file_type: "PDF",
        async: false,
      }),
    });

    if (!transactionResponse.ok) {
      const error = await transactionResponse.text();
      console.error("Shippo transaction error:", error);
      throw new Error(`Failed to purchase label: ${error}`);
    }

    const transaction = await transactionResponse.json();

    if (transaction.status !== "SUCCESS") {
      console.error("Transaction failed:", transaction);
      throw new Error(`Label purchase failed: ${transaction.messages || "Unknown error"}`);
    }

    console.log("Label purchased successfully:", transaction.object_id);

    // Update order with label information
    const { error: updateError } = await supabaseClient
      .from("orders")
      .update({
        label_url: transaction.label_url,
        tracking_number: transaction.tracking_number,
        carrier: transaction.carrier || "USPS",
        label_cost_cents: labelCostCents,
        shipping_charged_cents: shippingChargedCents,
        shipping_margin_cents: shippingMarginCents,
        shippo_transaction_id: transaction.object_id,
        shippo_rate_id: rateId,
        shipping_status: "label_created",
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw new Error("Failed to update order with label information");
    }

    return new Response(
      JSON.stringify({
        success: true,
        label_url: transaction.label_url,
        tracking_number: transaction.tracking_number,
        tracking_url: transaction.tracking_url_provider,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error purchasing shipping label:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
