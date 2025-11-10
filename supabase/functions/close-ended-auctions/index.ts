import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    console.log("[CLOSE-AUCTIONS] Starting auction close process");

    // Find ended auctions that are still active
    const { data: endedAuctions, error: fetchError } = await supabaseClient
      .from("listings")
      .select("id, user_id, title, ends_at")
      .eq("type", "auction")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    if (fetchError) throw fetchError;

    console.log(`[CLOSE-AUCTIONS] Found ${endedAuctions?.length || 0} ended auctions`);

    for (const auction of endedAuctions || []) {
      try {
        // Get highest bid
        const { data: bids, error: bidError } = await supabaseClient
          .from("bids")
          .select("id, user_id, bid_amount")
          .eq("listing_id", auction.id)
          .order("bid_amount", { ascending: false })
          .limit(1);

        if (bidError) throw bidError;

        // Update auction status
        await supabaseClient
          .from("listings")
          .update({ status: "ended" })
          .eq("id", auction.id);

        if (bids && bids.length > 0) {
          const winningBid = bids[0];

          // Mark winning bid
          await supabaseClient
            .from("bids")
            .update({ is_winning_bid: true })
            .eq("id", winningBid.id);

          // Get winner's email
          const { data: userData } = await supabaseClient.auth.admin.getUserById(
            winningBid.user_id
          );

          if (userData?.user?.email) {
            // Check if Stripe customer exists
            const customers = await stripe.customers.list({
              email: userData.user.email,
              limit: 1,
            });

            const customerId = customers.data.length > 0
              ? customers.data[0].id
              : undefined;

            // Create checkout session for winner
            const session = await stripe.checkout.sessions.create({
              customer: customerId,
              customer_email: customerId ? undefined : userData.user.email,
              line_items: [
                {
                  price_data: {
                    currency: "usd",
                    product_data: {
                      name: auction.title,
                      description: `Auction won - Final bid: $${winningBid.bid_amount}`,
                    },
                    unit_amount: Math.round(winningBid.bid_amount * 100),
                  },
                  quantity: 1,
                },
              ],
              mode: "payment",
              success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${req.headers.get("origin")}/l/${auction.id}`,
              metadata: {
                listing_id: auction.id,
                seller_id: auction.user_id,
                type: "auction",
              },
            });

            // Notify winner
            await supabaseClient.from("notification_queue").insert({
              user_id: winningBid.user_id,
              type: "auction_won",
              title: "Auction Won!",
              message: `Congratulations! You won the auction for "${auction.title}" with a bid of $${winningBid.bid_amount}.`,
              link: `/l/${auction.id}`,
              data: {
                checkout_url: session.url,
                listing_id: auction.id,
              },
            });

            // Notify seller
            await supabaseClient.from("notification_queue").insert({
              user_id: auction.user_id,
              type: "auction_ended",
              title: "Auction Ended",
              message: `Your auction for "${auction.title}" ended with a winning bid of $${winningBid.bid_amount}.`,
              link: `/l/${auction.id}`,
            });

            console.log(`[CLOSE-AUCTIONS] Closed auction ${auction.id} with winner`);
          }
        } else {
          // No bids - just notify seller
          await supabaseClient.from("notification_queue").insert({
            user_id: auction.user_id,
            type: "auction_ended",
            title: "Auction Ended",
            message: `Your auction for "${auction.title}" ended with no bids.`,
            link: `/l/${auction.id}`,
          });

          console.log(`[CLOSE-AUCTIONS] Closed auction ${auction.id} with no bids`);
        }
      } catch (error) {
        console.error(`[CLOSE-AUCTIONS] Error processing auction ${auction.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: endedAuctions?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CLOSE-AUCTIONS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
