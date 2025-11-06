import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailyStats {
  user_id: string;
  email: string;
  username: string;
  new_scans: number;
  new_sales: number;
  pending_payouts: number;
  total_payout_amount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all users who want daily emails
    const { data: profiles, error: profilesError } = await supabaseClient
      .from("profiles")
      .select("user_id, username, notify_via_email")
      .eq("notify_via_email", true);

    if (profilesError) throw profilesError;

    console.log(`Found ${profiles.length} users with email notifications enabled`);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Process each user
    for (const profile of profiles) {
      try {
        // Get user email from auth
        const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(
          profile.user_id
        );

        if (userError || !userData.user?.email) {
          console.log(`Skipping user ${profile.user_id}: no email found`);
          continue;
        }

        // Count new scans (inventory items) in last 24h
        const { count: newScans } = await supabaseClient
          .from("inventory_items")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.user_id)
          .gte("created_at", yesterday.toISOString())
          .lt("created_at", today.toISOString());

        // Count new sales (orders where user is seller) in last 24h
        const { count: newSales } = await supabaseClient
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", profile.user_id)
          .eq("payment_status", "succeeded")
          .gte("created_at", yesterday.toISOString())
          .lt("created_at", today.toISOString());

        // Count pending payouts
        const { count: pendingPayouts, data: pendingOrders } = await supabaseClient
          .from("orders")
          .select("amount")
          .eq("seller_id", profile.user_id)
          .eq("payout_status", "held");

        const totalPendingAmount = pendingOrders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;

        // Only send email if there's something to report
        if ((newScans || 0) > 0 || (newSales || 0) > 0 || (pendingPayouts || 0) > 0) {
          const emailHtml = `
            <h1>Daily Seller Digest</h1>
            <p>Hello ${profile.username || "Seller"}!</p>
            <p>Here's your daily summary:</p>
            <ul>
              <li><strong>New Scans:</strong> ${newScans || 0} items added to inventory</li>
              <li><strong>New Sales:</strong> ${newSales || 0} items sold</li>
              <li><strong>Pending Payouts:</strong> ${pendingPayouts || 0} orders ($${totalPendingAmount.toFixed(2)})</li>
            </ul>
            <p>Keep up the great work!</p>
            <p><a href="${Deno.env.get("SUPABASE_URL")}/inventory">View Your Inventory</a></p>
          `;

          await resend.emails.send({
            from: "Daily Digest <noreply@resend.dev>",
            to: [userData.user.email],
            subject: "Your Daily Seller Summary",
            html: emailHtml,
          });

          console.log(`Sent digest to ${userData.user.email}`);
        } else {
          console.log(`No activity for ${userData.user.email}, skipping email`);
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.user_id}:`, userError);
        // Continue with next user
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: profiles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in send-daily-digest:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
