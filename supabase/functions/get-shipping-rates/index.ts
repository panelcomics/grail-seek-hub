import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHIPPING_MARKUP_CENTS = 75; // $0.75 markup on all labels

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { fromAddress, toAddress, parcel } = await req.json();

    console.log("Getting shipping rates from Shippo");

    const shippoApiKey = Deno.env.get("SHIPPO_API_KEY");
    if (!shippoApiKey) {
      throw new Error("SHIPPO_API_KEY not configured");
    }

    // Create shipment in Shippo to get rates
    const shipmentResponse = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: {
        "Authorization": `ShippoToken ${shippoApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address_from: fromAddress,
        address_to: toAddress,
        parcels: [parcel],
        async: false,
      }),
    });

    if (!shipmentResponse.ok) {
      const error = await shipmentResponse.text();
      console.error("Shippo API error:", error);
      throw new Error(`Failed to get shipping rates: ${error}`);
    }

    const shipment = await shipmentResponse.json();
    console.log("Shippo shipment created:", shipment.object_id);

    // Add markup to rates and format for frontend
    const ratesWithMarkup = shipment.rates.map((rate: any) => {
      const labelCostCents = Math.round(parseFloat(rate.amount) * 100);
      const shippingChargedCents = labelCostCents + SHIPPING_MARKUP_CENTS;
      const shippingMarginCents = SHIPPING_MARKUP_CENTS;

      return {
        rate_id: rate.object_id,
        provider: rate.provider,
        servicelevel: rate.servicelevel.name,
        duration_terms: rate.duration_terms,
        estimated_days: rate.estimated_days,
        label_cost_cents: labelCostCents,
        shipping_charged_cents: shippingChargedCents,
        shipping_margin_cents: shippingMarginCents,
        display_price: `$${(shippingChargedCents / 100).toFixed(2)}`,
      };
    });

    return new Response(
      JSON.stringify({
        rates: ratesWithMarkup,
        shipment_id: shipment.object_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error getting shipping rates:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
