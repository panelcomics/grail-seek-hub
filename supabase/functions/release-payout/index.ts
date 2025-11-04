import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReleasePayoutRequest {
  orderId: string;
  action: "release" | "delay";
  delayHours?: number;
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

    // Verify admin access
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roles) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { orderId, action, delayHours = 24 } = await req.json() as ReleasePayoutRequest;

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payout_status, transfer_id, charge_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "release") {
      // Release payout immediately
      await supabase
        .from("orders")
        .update({
          payout_status: "released",
          payout_released_at: new Date().toISOString(),
          payout_hold_until: new Date().toISOString(),
        })
        .eq("id", orderId);

      console.log(`Admin released payout for order ${orderId}`);
    } else if (action === "delay") {
      // Delay payout
      const newHoldTime = new Date(Date.now() + delayHours * 60 * 60 * 1000);
      
      await supabase
        .from("orders")
        .update({
          payout_hold_until: newHoldTime.toISOString(),
        })
        .eq("id", orderId);

      console.log(`Admin delayed payout for order ${orderId} by ${delayHours} hours`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Payout ${action}d successfully`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in release-payout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});