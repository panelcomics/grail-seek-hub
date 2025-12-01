import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { type, userId, fullName, email, creatorType, roleRequested, adminNotes } = await req.json();

    // Get user email
    const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
    if (!userData.user?.email) {
      throw new Error("User email not found");
    }

    const userEmail = userData.user.email;

    // Check if Resend is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(JSON.stringify({ ok: true, emailSent: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email based on type
    let emailSubject = "";
    let emailHtml = "";

    if (type === "submitted") {
      // Notify admin
      emailSubject = "New Creator Application Received";
      emailHtml = `
        <h1>New Creator Application</h1>
        <p><strong>Full Name:</strong> ${fullName || 'Not provided'}</p>
        <p><strong>Creator Type:</strong> ${creatorType || roleRequested}</p>
        <p><strong>Email:</strong> ${email || userEmail}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><a href="${Deno.env.get("SUPABASE_URL")}/creators/admin">Review Application in Dashboard</a></p>
      `;

      // Send to admin email
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "GrailSeeker <noreply@grailseeker.com>",
          to: ["creators@grailseeker.com"],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "approved") {
      const creatorRole = creatorType || roleRequested || 'creator';
      emailSubject = "🎉 Your GrailSeeker Creator Account Has Been Approved!";
      emailHtml = `
        <h1>Congratulations, ${fullName || 'Creator'}!</h1>
        <p>Your application to become a creator on GrailSeeker has been approved!</p>
        <p><strong>Approved as:</strong> ${creatorRole.replace('_', ' ')}</p>
        
        <h2>Next Steps:</h2>
        <ul>
          <li>Visit your <a href="${Deno.env.get("SUPABASE_URL")}/creators/dashboard">Creator Dashboard</a></li>
          <li>Complete your seller profile setup</li>
          <li>Start listing your work or launch crowdfunding campaigns</li>
        </ul>
        
        <p>Welcome to the GrailSeeker creator community!</p>
        <p>We're excited to see what you create.</p>
        
        <p>Best regards,<br>The GrailSeeker Team</p>
      `;
    } else if (type === "rejected") {
      emailSubject = "Update on Your GrailSeeker Creator Application";
      emailHtml = `
        <h1>Application Update</h1>
        <p>Thank you for your interest in becoming a creator on GrailSeeker.</p>
        <p>Unfortunately, we're unable to approve your application at this time.</p>
        ${adminNotes ? `<p><strong>Feedback:</strong> ${adminNotes}</p>` : ""}
        <p>You're welcome to reapply in the future. We appreciate your interest in our platform.</p>
      `;
    }

    // Send email to applicant
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "GrailSeeker <noreply@grailseeker.com>",
        to: [userEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error("Failed to send email");
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in creator-notify:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
