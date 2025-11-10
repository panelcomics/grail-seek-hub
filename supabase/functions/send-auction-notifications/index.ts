import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[AUCTION-NOTIF] Starting auction notification check");

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Find auctions ending in 1 hour (±2 minutes buffer)
    const { data: oneHourAuctions, error: oneHourError } = await supabaseClient
      .from("listings")
      .select("id, title, user_id, ends_at")
      .eq("type", "auction")
      .eq("status", "active")
      .gte("ends_at", new Date(oneHourFromNow.getTime() - 2 * 60 * 1000).toISOString())
      .lte("ends_at", new Date(oneHourFromNow.getTime() + 2 * 60 * 1000).toISOString());

    if (oneHourError) throw oneHourError;

    // Process 1-hour notifications
    for (const auction of oneHourAuctions || []) {
      const { data: watches } = await supabaseClient
        .from("auction_watches")
        .select("user_id, notified_1hour")
        .eq("listing_id", auction.id)
        .eq("notified_1hour", false);

      for (const watch of watches || []) {
        await supabaseClient.from("notification_queue").insert({
          user_id: watch.user_id,
          type: "auction_ending",
          title: "Auction Ending Soon",
          message: `The auction for "${auction.title}" ends in 1 hour!`,
          link: `/l/${auction.id}`,
        });

        await supabaseClient
          .from("auction_watches")
          .update({ notified_1hour: true })
          .eq("user_id", watch.user_id)
          .eq("listing_id", auction.id);
      }

      console.log(`[AUCTION-NOTIF] Sent 1-hour notifications for auction ${auction.id}`);
    }

    // Find auctions ending in 10 minutes (±1 minute buffer)
    const { data: tenMinuteAuctions, error: tenMinError } = await supabaseClient
      .from("listings")
      .select("id, title, user_id, ends_at")
      .eq("type", "auction")
      .eq("status", "active")
      .gte("ends_at", new Date(tenMinutesFromNow.getTime() - 60 * 1000).toISOString())
      .lte("ends_at", new Date(tenMinutesFromNow.getTime() + 60 * 1000).toISOString());

    if (tenMinError) throw tenMinError;

    // Process 10-minute notifications
    for (const auction of tenMinuteAuctions || []) {
      const { data: watches } = await supabaseClient
        .from("auction_watches")
        .select("user_id, notified_10min")
        .eq("listing_id", auction.id)
        .eq("notified_10min", false);

      for (const watch of watches || []) {
        await supabaseClient.from("notification_queue").insert({
          user_id: watch.user_id,
          type: "auction_ending",
          title: "Auction Ending Soon!",
          message: `FINAL CALL: The auction for "${auction.title}" ends in 10 minutes!`,
          link: `/l/${auction.id}`,
        });

        await supabaseClient
          .from("auction_watches")
          .update({ notified_10min: true })
          .eq("user_id", watch.user_id)
          .eq("listing_id", auction.id);
      }

      console.log(`[AUCTION-NOTIF] Sent 10-minute notifications for auction ${auction.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        oneHourNotifications: oneHourAuctions?.length || 0,
        tenMinNotifications: tenMinuteAuctions?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[AUCTION-NOTIF] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
