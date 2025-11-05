import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userId: string;
  message: string;
  link?: string;
  type: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { userId, message, link, type }: EmailRequest = await req.json();

    // Fetch user email and preferences
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, notify_via_email")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile || !profile.notify_via_email) {
      console.log("User email notifications disabled or profile not found");
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email from auth
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authData?.user?.email) {
      console.error("Error fetching user email:", authError);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userEmail = authData.user.email;
    const buttonUrl = link ? `${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app")}${link}` : undefined;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Inter, -apple-system, sans-serif; background: #0a0a0a; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 24px; text-align: center; }
            .logo { color: white; font-size: 24px; font-weight: bold; margin: 0; }
            .content { padding: 32px 24px; color: #e5e5e5; }
            .message { font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
            .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
            .footer { padding: 24px; text-align: center; color: #737373; font-size: 14px; border-top: 1px solid #2a2a2a; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">Grail Seeker</h1>
            </div>
            <div class="content">
              <p class="message">${message}</p>
              ${buttonUrl ? `<a href="${buttonUrl}" class="button">View Now</a>` : ''}
            </div>
            <div class="footer">
              <p>You're receiving this because you have notifications enabled.</p>
              <p><a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app")}/settings" style="color: #ef4444;">Manage preferences</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using fetch to Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ skipped: true, reason: "No API key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Grail Seeker <notifications@resend.dev>",
        to: [userEmail],
        subject: type === "auction_ending" ? "⏰ Auction Ending Soon" : "🔔 New Notification",
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify(emailResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
