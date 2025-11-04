import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmDeliveryRequest {
  orderId: string;
  trackingNumber?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orderId, trackingNumber } = await req.json() as ConfirmDeliveryRequest;

    // Get order and verify seller ownership
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, seller_id, shipping_status, amount, shipping_amount, payout_hold_until")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.seller_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to update this order" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const deliveryConfirmedAt = now.toISOString();

    // Update order shipping status
    const updateData: any = {
      shipping_status: "delivered",
      delivery_confirmed_at: deliveryConfirmedAt,
    };

    if (trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }

    // Check if high-value transaction
    const isHighValue = (order.amount + order.shipping_amount) > 1000;
    
    if (isHighValue) {
      // Add 48-hour dispute window for high-value
      const holdUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      updateData.payout_hold_until = holdUntil.toISOString();
    } else {
      // For regular transactions, check if hold period has passed
      const currentHold = new Date(order.payout_hold_until);
      if (now >= currentHold) {
        updateData.payout_status = "released";
        updateData.payout_released_at = deliveryConfirmedAt;
      }
    }

    await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    // Update seller completed sales count
    await supabase.rpc("increment_completed_sales", { seller_user_id: user.id });

    // Update seller tier based on completed sales
    const { data: profile } = await supabase
      .from("profiles")
      .select("completed_sales_count")
      .eq("user_id", user.id)
      .single();

    if (profile && profile.completed_sales_count >= 10) {
      await supabase
        .from("profiles")
        .update({ seller_tier: "verified" })
        .eq("user_id", user.id);
    }

    console.log(`Delivery confirmed for order ${orderId}. Payout status updated.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Delivery confirmed successfully",
        payoutStatus: updateData.payout_status || "held",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in confirm-delivery:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});