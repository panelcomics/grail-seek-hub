import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Parse request body to get returnTo parameter
    const { returnTo } = await req.json().catch(() => ({ returnTo: null }));

    // Check if user already has a Stripe account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete, username")
      .eq("user_id", user.id)
      .single();

    let accountId = profile?.stripe_account_id;

    // Create new Connect account if doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });

      accountId = account.id;

      // Save account ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("user_id", user.id);

      console.log(`Created new Stripe Connect account: ${accountId} for user ${user.id}`);
    }

    // Build return URL with optional returnTo parameter
    const origin = req.headers.get("origin");
    const baseReturnUrl = `${origin}/seller-setup`;
    const returnUrl = returnTo 
      ? `${baseReturnUrl}?success=true&returnTo=${encodeURIComponent(returnTo)}`
      : `${baseReturnUrl}?success=true`;

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/seller-setup${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    console.log(`Generated account link for ${accountId}`);

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-connect-account-link:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});