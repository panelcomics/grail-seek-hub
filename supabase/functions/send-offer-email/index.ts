import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OfferEmailRequest {
  buyerEmail: string;
  buyerName?: string;
  listingTitle: string;
  offerAmount: number;
  status: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { buyerEmail, buyerName, listingTitle, offerAmount, status }: OfferEmailRequest = await req.json();

    console.log(`[NOTIFICATIONS] Processing offer email for ${buyerEmail}, status: ${status}`);

    // Check if email provider is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("[NOTIFICATIONS] Email provider not configured, skipping email");
      return new Response(
        JSON.stringify({ success: false, reason: "not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only send emails for accepted offers
    if (status !== "accepted") {
      console.log("[NOTIFICATIONS] Skipping email for non-accepted offer");
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = buyerName || "there";
    const formattedAmount = `$${offerAmount.toFixed(2)}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Inter, -apple-system, sans-serif; background: #0a0a0a; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center; }
            .logo { color: white; font-size: 24px; font-weight: bold; margin: 0; }
            .content { padding: 32px 24px; color: #e5e5e5; }
            .highlight { background: #10b981; color: white; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: center; }
            .amount { font-size: 32px; font-weight: bold; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
            .footer { padding: 24px; text-align: center; color: #737373; font-size: 14px; border-top: 1px solid #2a2a2a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">✅ Offer Accepted!</h1>
            </div>
            <div class="content">
              <h2 style="color: #10b981; margin-top: 0;">Great news, ${displayName}!</h2>
              <p style="font-size: 16px; line-height: 1.6;">
                Your offer on <strong>${listingTitle}</strong> has been accepted by the seller.
              </p>
              <div class="highlight">
                <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-bottom: 8px;">Accepted Offer Amount</div>
                <div class="amount">${formattedAmount}</div>
              </div>
              <p style="font-size: 16px; line-height: 1.6;">
                Log in to Grail Seeker to complete your purchase and arrange payment and shipping with the seller.
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
        subject: `✅ Your offer on "${listingTitle}" was accepted!`,
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
    console.log("[NOTIFICATIONS] Offer email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, result: emailResult }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[NOTIFICATIONS] Error in send-offer-email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
