import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[SUBSCRIPTION-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature if webhook secret is configured
    const webhookSecret = Deno.env.get("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET");
    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("No stripe-signature header");
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } else {
      // In development, parse event without verification
      event = JSON.parse(body) as Stripe.Event;
      logStep("Webhook parsed (no signature verification - development mode)");
    }

    logStep("Event type", { type: event.type });

    // Initialize Supabase with service role for database updates
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Handle subscription events
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabaseUrl, supabaseKey, stripe, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseUrl, supabaseKey, subscription);
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function handleSubscriptionChange(
  supabaseUrl: string,
  supabaseKey: string,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  logStep("Processing subscription change", {
    subscriptionId: subscription.id,
    status: subscription.status,
    customerId: subscription.customer,
  });

  const supabase = createClient(supabaseUrl, supabaseKey, { 
    auth: { persistSession: false } 
  });

  // Get user ID from subscription metadata or customer
  let userId = subscription.metadata?.supabase_user_id;

  if (!userId) {
    // Try to get user ID from customer metadata
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (!customer.deleted) {
      userId = customer.metadata?.supabase_user_id;
    }
  }

  if (!userId) {
    // Try to look up by customer ID in profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", subscription.customer as string)
      .single();
    
    userId = (profile as { user_id?: string } | null)?.user_id;
  }

  if (!userId) {
    logStep("Could not find user for subscription", { customerId: subscription.customer });
    return;
  }

  logStep("Found user for subscription", { userId });

  const tier = subscription.metadata?.tier || "elite";
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const periodStart = new Date(subscription.current_period_start * 1000).toISOString();

  // Check if subscription record exists
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existingSub) {
    // Update existing record
    await supabase
      .from("user_subscriptions")
      .update({
        status: subscription.status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
      } as Record<string, unknown>)
      .eq("stripe_subscription_id", subscription.id);
  } else {
    // Insert new record
    await supabase
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        tier: tier,
        status: subscription.status,
        current_period_start: periodStart,
        current_period_end: periodEnd,
      } as Record<string, unknown>);
  }

  // Update profiles table
  const profileUpdate = isActive
    ? { subscription_tier: tier, subscription_expires_at: periodEnd }
    : { subscription_tier: null, subscription_expires_at: null };

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profileUpdate as Record<string, unknown>)
    .eq("user_id", userId);

  if (profileError) {
    logStep("Error updating profile", { error: profileError.message });
  } else {
    logStep("Profile updated", { userId, tier: isActive ? tier : "free" });
  }
}

async function handleSubscriptionDeleted(
  supabaseUrl: string,
  supabaseKey: string,
  subscription: Stripe.Subscription
) {
  logStep("Processing subscription deletion", {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });

  const supabase = createClient(supabaseUrl, supabaseKey, { 
    auth: { persistSession: false } 
  });

  // Update user_subscriptions status
  await supabase
    .from("user_subscriptions")
    .update({ status: "canceled" } as Record<string, unknown>)
    .eq("stripe_subscription_id", subscription.id);

  // Find user and reset their tier
  const { data: subRecord } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  const userId = (subRecord as { user_id?: string } | null)?.user_id;

  if (userId) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: null,
        subscription_expires_at: null,
      } as Record<string, unknown>)
      .eq("user_id", userId);

    if (profileError) {
      logStep("Error resetting profile tier", { error: profileError.message });
    } else {
      logStep("Profile tier reset to free", { userId });
    }
  }
}
