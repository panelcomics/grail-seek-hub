import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CloseClaimSaleRequest {
  claimSaleId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Authentication required");
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Invalid authentication:", authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { claimSaleId } = await req.json() as CloseClaimSaleRequest;

    if (!claimSaleId) {
      return new Response(
        JSON.stringify({ error: "claimSaleId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing claim sale closure for: ${claimSaleId}`);

    // Fetch the claim sale and verify authorization
    const { data: sale, error: saleError } = await supabase
      .from("claim_sales")
      .select("*")
      .eq("id", claimSaleId)
      .single();

    if (saleError || !sale) {
      console.error("Error fetching claim sale:", saleError);
      return new Response(
        JSON.stringify({ error: "Claim sale not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is seller or admin
    const isSeller = sale.seller_id === user.id;
    let isAdmin = false;

    if (!isSeller) {
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("Error checking admin status:", roleError);
      }
      
      isAdmin = !!roles;
    }

    if (!isSeller && !isAdmin) {
      console.error(`Unauthorized access attempt by user ${user.id} for claim sale ${claimSaleId}`);
      return new Response(
        JSON.stringify({ error: "Unauthorized: You must be the seller or an admin to close this claim sale" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Authorized user ${user.id} (${isSeller ? 'seller' : 'admin'}) closing claim sale ${claimSaleId}`);

    // Check if already closed
    if (sale.status === "closed") {
      console.log("Claim sale already closed");
      return new Response(
        JSON.stringify({ message: "Claim sale already closed", winners: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all claims ordered by timestamp
    const { data: allClaims, error: claimsError } = await supabase
      .from("claims")
      .select("id, user_id, claimed_at")
      .eq("claim_sale_id", claimSaleId)
      .order("claimed_at", { ascending: true });

    if (claimsError) {
      console.error("Error fetching claims:", claimsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch claims" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Select top N winners where N = total_items
    const winners = allClaims.slice(0, sale.total_items);
    const winnerIds = winners.map(w => w.id);

    console.log(`Found ${allClaims.length} total claims, selecting ${winners.length} winners`);

    // Mark winners
    if (winnerIds.length > 0) {
      const { error: updateError } = await supabase
        .from("claims")
        .update({ is_winner: true })
        .in("id", winnerIds);

      if (updateError) {
        console.error("Error marking winners:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to mark winners" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Close the sale
    const { error: closeError } = await supabase
      .from("claim_sales")
      .update({ 
        status: "closed",
        claimed_items: winners.length 
      })
      .eq("id", claimSaleId);

    if (closeError) {
      console.error("Error closing sale:", closeError);
      return new Response(
        JSON.stringify({ error: "Failed to close sale" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully closed claim sale with ${winners.length} winners`);

    return new Response(
      JSON.stringify({ 
        message: "Claim sale closed successfully",
        totalClaims: allClaims.length,
        winners: winners.length,
        winnerIds: winnerIds
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in close-claim-sale function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
