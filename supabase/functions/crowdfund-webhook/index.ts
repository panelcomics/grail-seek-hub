import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
  }

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log(`[CROWDFUND-WEBHOOK] Received event: ${event.type}`);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process campaign pledges
      if (session.metadata?.type !== "campaign_pledge") {
        console.log("[CROWDFUND-WEBHOOK] Not a campaign pledge, skipping");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const { campaign_id, reward_id, backer_id } = session.metadata;
      const amountCents = session.amount_total || 0;

      console.log(`[CROWDFUND-WEBHOOK] Processing pledge for campaign ${campaign_id}`);

      // Create pledge record
      const { error: pledgeError } = await supabaseAdmin
        .from("campaign_pledges")
        .insert({
          campaign_id,
          reward_id: reward_id || null,
          backer_id,
          amount_cents: amountCents,
          currency: "USD",
          status: "paid",
          stripe_payment_intent_id: session.payment_intent as string,
        });

      if (pledgeError) {
        console.error("[CROWDFUND-WEBHOOK] Error creating pledge:", pledgeError);
        throw pledgeError;
      }

      // Update campaign totals
      const { data: campaign } = await supabaseAdmin
        .from("campaigns")
        .select("current_pledged_cents, backers_count")
        .eq("id", campaign_id)
        .single();

      if (campaign) {
        const { error: updateError } = await supabaseAdmin
          .from("campaigns")
          .update({
            current_pledged_cents: campaign.current_pledged_cents + amountCents,
            backers_count: campaign.backers_count + 1,
          })
          .eq("id", campaign_id);

        if (updateError) {
          console.error("[CROWDFUND-WEBHOOK] Error updating campaign:", updateError);
        }
      }

      // Update reward claimed quantity if applicable
      if (reward_id) {
        const { data: reward } = await supabaseAdmin
          .from("campaign_rewards")
          .select("claimed_quantity")
          .eq("id", reward_id)
          .single();

        if (reward) {
          await supabaseAdmin
            .from("campaign_rewards")
            .update({
              claimed_quantity: reward.claimed_quantity + 1,
            })
            .eq("id", reward_id);
        }
      }

      // TODO: Check if funding goal reached and update status to "successful"
      // TODO: Create notification for campaign creator
      // TODO: Unlock stretch goals if applicable

      console.log(`[CROWDFUND-WEBHOOK] Pledge processed successfully`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error: any) {
    console.error("[CROWDFUND-WEBHOOK] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});