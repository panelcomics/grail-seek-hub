import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitDisputeRequest {
  name: string;
  email: string;
  tradeId?: string;
  description: string;
  fileUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user if authenticated (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const { name, email, tradeId, description, fileUrl } = await req.json() as SubmitDisputeRequest;

    // Validate required fields
    if (!name || !email || !description) {
      return new Response(
        JSON.stringify({ error: "Name, email, and description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate description length
    if (description.length < 10 || description.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Description must be between 10 and 5000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create dispute record
    const { data: dispute, error: disputeError } = await supabase
      .from("disputes")
      .insert({
        user_id: userId,
        trade_id: tradeId || null,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        description: description.trim(),
        file_url: fileUrl || null,
        status: 'open'
      })
      .select()
      .single();

    if (disputeError) {
      console.error("Error creating dispute:", disputeError);
      throw disputeError;
    }

    // Send email notification to support
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const emailBody = `
          <h2>New Dispute Submitted</h2>
          <p><strong>Dispute ID:</strong> ${dispute.id}</p>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${tradeId ? `<p><strong>Trade ID:</strong> ${tradeId}</p>` : ''}
          ${userId ? `<p><strong>User ID:</strong> ${userId}</p>` : '<p><em>Submitted by non-authenticated user</em></p>'}
          
          <h3>Description:</h3>
          <p>${description.replace(/\n/g, '<br>')}</p>
          
          ${fileUrl ? `<p><strong>Attached File:</strong> <a href="${fileUrl}">${fileUrl}</a></p>` : ''}
          
          <p><em>Submitted at: ${new Date().toISOString()}</em></p>
        `;

        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Grail Seeker Disputes <disputes@grailseeker.app>",
            to: ["support@grailseeker.app"],
            subject: `New Dispute #${dispute.id.substring(0, 8)} - ${name}`,
            html: emailBody,
          }),
        });

        if (!response.ok) {
          console.error("Failed to send email notification:", await response.text());
        } else {
          console.log("Email notification sent successfully");
        }
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
        // Don't fail the request if email fails
      }
    }

    console.log(`Dispute created successfully: ${dispute.id}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        disputeId: dispute.id,
        message: "Your dispute has been received. Our team will review and respond within 48 hours."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in submit-dispute:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
