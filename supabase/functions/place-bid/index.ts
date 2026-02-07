import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { listing_id, bid_amount } = await req.json();

    if (!listing_id || !bid_amount || typeof bid_amount !== "number" || bid_amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid listing_id or bid_amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PLACE-BID] User ${user.id} bidding $${bid_amount} on listing ${listing_id}`);

    // Verify the listing exists, is an auction, and is active
    const { data: listing, error: listingError } = await serviceClient
      .from("listings")
      .select("id, title, type, status, ends_at, user_id")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return new Response(
        JSON.stringify({ error: "Listing not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (listing.type !== "auction") {
      return new Response(
        JSON.stringify({ error: "This listing is not an auction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (listing.status !== "active") {
      return new Response(
        JSON.stringify({ error: "This auction is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (listing.ends_at && new Date(listing.ends_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This auction has ended" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent seller from bidding on their own auction
    if (listing.user_id === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot bid on your own auction" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current highest bid
    const { data: currentHighestBids, error: highBidError } = await serviceClient
      .from("bids")
      .select("id, user_id, bid_amount")
      .eq("listing_id", listing_id)
      .order("bid_amount", { ascending: false })
      .limit(1);

    if (highBidError) throw highBidError;

    const currentHighest = currentHighestBids?.[0] ?? null;

    // Validate bid is higher than current highest
    if (currentHighest && bid_amount <= currentHighest.bid_amount) {
      return new Response(
        JSON.stringify({
          error: `Bid must be higher than the current highest bid of $${currentHighest.bid_amount}`,
          current_highest: currentHighest.bid_amount,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert the new bid
    const { data: newBid, error: insertError } = await serviceClient
      .from("bids")
      .insert({
        listing_id,
        user_id: user.id,
        bid_amount,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`[PLACE-BID] Bid ${newBid.id} placed successfully: $${bid_amount}`);

    // Send outbid notification to previous highest bidder (if different user)
    if (currentHighest && currentHighest.user_id !== user.id) {
      const { error: notifError } = await serviceClient
        .from("notification_queue")
        .insert({
          user_id: currentHighest.user_id,
          type: "outbid",
          title: "You've Been Outbid!",
          message: `Someone placed a higher bid of $${bid_amount.toFixed(2)} on "${listing.title}". Place a new bid to stay in the running!`,
          link: `/l/${listing_id}`,
          data: {
            listing_id,
            new_bid_amount: bid_amount,
            your_bid_amount: currentHighest.bid_amount,
          },
        });

      if (notifError) {
        console.error("[PLACE-BID] Error sending outbid notification:", notifError);
      } else {
        console.log(
          `[PLACE-BID] Outbid notification sent to user ${currentHighest.user_id}`
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        bid: {
          id: newBid.id,
          bid_amount: newBid.bid_amount,
          listing_id: newBid.listing_id,
        },
        outbid_user: currentHighest?.user_id !== user.id ? currentHighest?.user_id : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[PLACE-BID] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
