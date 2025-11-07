import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userId?: string;
  message?: string;
  link?: string;
  type: string;
  data?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller (verify_jwt = true handles this, but we double-check)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the caller's identity
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, message, link, type, data }: EmailRequest = await req.json();

    // Handle admin notifications for artist applications
    if (type === "artist_application") {
      console.log("Processing artist application notification from user:", user.id);
      
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (!resendApiKey) {
        console.log("RESEND_API_KEY not configured, skipping email");
        return new Response(JSON.stringify({ skipped: true, reason: "No API key" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const artistName = data?.artistName || "Unknown Artist";
      const portfolioUrl = data?.portfolioUrl || "Not provided";
      const sampleCount = data?.sampleCount || 0;
      const userEmail = data?.userEmail || "Unknown";
      
      const adminEmailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Inter, -apple-system, sans-serif; background: #0a0a0a; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; }
              .header { background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 24px; text-align: center; }
              .logo { color: white; font-size: 24px; font-weight: bold; margin: 0; }
              .content { padding: 32px 24px; color: #e5e5e5; }
              .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #2a2a2a; }
              .info-label { font-weight: 600; width: 140px; color: #a3a3a3; }
              .info-value { color: #e5e5e5; flex: 1; }
              .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 24px 0 16px; }
              .footer { padding: 24px; text-align: center; color: #737373; font-size: 14px; border-top: 1px solid #2a2a2a; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="logo">🎨 New Artist Verification Application</h1>
              </div>
              <div class="content">
                <h2 style="color: #ef4444; margin-top: 0;">Application Details</h2>
                <div class="info-row">
                  <div class="info-label">Artist Name:</div>
                  <div class="info-value">${artistName}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">User Email:</div>
                  <div class="info-value">${userEmail}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Portfolio:</div>
                  <div class="info-value">${portfolioUrl === "Not provided" ? portfolioUrl : `<a href="${portfolioUrl}" style="color: #ef4444;">${portfolioUrl}</a>`}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Samples Uploaded:</div>
                  <div class="info-value">${sampleCount} image${sampleCount !== 1 ? 's' : ''}</div>
                </div>
                <a href="${supabaseUrl?.replace("supabase.co", "lovable.app")}/settings" class="button">Review Application in Admin Panel</a>
                <p style="color: #a3a3a3; font-size: 14px; margin-top: 24px;">
                  Review the application, verify the samples, and approve or deny the artist verification request.
                </p>
              </div>
              <div class="footer">
                <p>Grail Seeker Admin Notification System</p>
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
          from: "Grail Seeker Admin <notifications@resend.dev>",
          to: ["info@panelcomics.com"],
          subject: `New Verified Artist Application — ${artistName}`,
          html: adminEmailHtml,
        }),
      });

      const emailResult = await emailResponse.json();
      console.log("Admin email sent successfully:", emailResult);

      return new Response(JSON.stringify(emailResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle user notifications (require userId)
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId required for user notifications" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization check: Only allow sending to self or if admin
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminCheck;
    
    if (userId !== user.id && !isAdmin) {
      console.error("Authorization failed: User", user.id, "attempted to send notification to", userId);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Can only send notifications to yourself" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const { data: authData, error: userAuthError } = await supabase.auth.admin.getUserById(userId);
    
    if (userAuthError || !authData?.user?.email) {
      console.error("Error fetching user email:", userAuthError);
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
