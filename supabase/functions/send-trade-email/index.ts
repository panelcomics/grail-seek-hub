import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TradeEmailRequest {
  buyerEmail: string;
  buyerName?: string;
  listingTitle: string;
  offerTitle: string;
  offerIssue?: string | null;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { buyerEmail, buyerName, listingTitle, offerTitle, offerIssue, status }: TradeEmailRequest = await req.json();

    console.log(`[NOTIFICATIONS] Processing trade email for ${buyerEmail}, status: ${status}`);

    // Check if email provider is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("[NOTIFICATIONS] Email provider not configured, skipping email");
      return new Response(
        JSON.stringify({ success: false, reason: "not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only send emails for approved trades
    if (status !== "approved") {
      console.log("[NOTIFICATIONS] Skipping email for non-approved trade");
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = buyerName || "there";
    const yourOffer = offerIssue ? `${offerTitle} #${offerIssue}` : offerTitle;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Inter, -apple-system, sans-serif; background: #0a0a0a; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
            .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); padding: 32px 24px; text-align: center; }
            .logo { color: white; font-size: 24px; font-weight: bold; margin: 0; }
            .content { padding: 32px 24px; color: #e5e5e5; }
            .trade-box { background: #8b5cf6; color: white; padding: 16px; border-radius: 8px; margin: 24px 0; }
            .trade-item { padding: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; margin: 8px 0; }
            .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
            .footer { padding: 24px; text-align: center; color: #737373; font-size: 14px; border-top: 1px solid #2a2a2a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">🔄 Trade Approved!</h1>
            </div>
            <div class="content">
              <h2 style="color: #8b5cf6; margin-top: 0;">Exciting news, ${displayName}!</h2>
              <p style="font-size: 16px; line-height: 1.6;">
                The seller has approved your trade request. Here's what's being traded:
              </p>
              <div class="trade-box">
                <div class="trade-item">
                  <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">You're trading:</div>
                  <div style="font-weight: bold;">${yourOffer}</div>
                </div>
                <div style="text-align: center; padding: 8px; font-size: 20px;">⇄</div>
                <div class="trade-item">
                  <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">You'll receive:</div>
                  <div style="font-weight: bold;">${listingTitle}</div>
                </div>
              </div>
              <p style="font-size: 16px; line-height: 1.6;">
                Log in to Grail Seeker to coordinate the trade details with the seller, including shipping arrangements.
              </p>
              <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app")}/seller/dashboard" class="button">View My Dashboard</a>
            </div>
            <div class="footer">
              <p>Grail Seeker Marketplace</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Grail Seeker <notifications@resend.dev>",
        to: [buyerEmail],
        subject: `🔄 Your trade for "${listingTitle}" was approved!`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("[NOTIFICATIONS] Resend API error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Email service error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResult = await emailResponse.json();
    console.log("[NOTIFICATIONS] Trade email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, result: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[NOTIFICATIONS] Error in send-trade-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
