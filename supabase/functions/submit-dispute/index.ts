import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Comprehensive input validation schema
const disputeSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
  email: z.string()
    .trim()
    .email("Invalid email format")
    .max(255, "Email is too long")
    .toLowerCase(),
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters"),
  fileUrl: z.string()
    .url("Invalid file URL")
    .regex(/^https:\/\/fiwmlzrhwvrsrxmcstzk\.supabase\.co\//, "File must be from approved storage")
    .optional()
    .nullable(),
  tradeId: z.string()
    .uuid("Invalid trade ID")
    .optional()
    .nullable(),
  orderId: z.string()
    .uuid("Invalid order ID")
    .optional()
    .nullable()
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID if authenticated (optional for disputes)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Parse and validate input
    const requestBody = await req.json();
    const validationResult = disputeSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("Input validation failed:", validationResult.error.issues);
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validatedData = validationResult.data;

    // Strip any HTML tags from description for safety
    const sanitizedDescription = validatedData.description.replace(/<[^>]*>/g, '');

    // Validate tradeId exists if provided
    if (validatedData.tradeId) {
      const { data: trade, error: tradeError } = await supabase
        .from("trades")
        .select("id")
        .eq("id", validatedData.tradeId)
        .maybeSingle();

      if (tradeError || !trade) {
        console.error("Invalid trade ID:", validatedData.tradeId);
        return new Response(
          JSON.stringify({ error: "Invalid trade ID provided" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Validate orderId exists if provided
    if (validatedData.orderId) {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("id", validatedData.orderId)
        .maybeSingle();

      if (orderError || !order) {
        console.error("Invalid order ID:", validatedData.orderId);
        return new Response(
          JSON.stringify({ error: "Invalid order ID provided" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Insert dispute with validated and sanitized data
    const { data: dispute, error: insertError } = await supabase
      .from("disputes")
      .insert({
        user_id: userId,
        name: validatedData.name,
        email: validatedData.email,
        description: sanitizedDescription,
        file_url: validatedData.fileUrl || null,
        trade_id: validatedData.tradeId || null,
        order_id: validatedData.orderId || null,
        status: "open",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting dispute:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to submit dispute" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Dispute submitted successfully:", dispute.id);

    // Send email notification if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "GrailSeeker <noreply@grailseeker.app>",
            to: ["support@grailseeker.app"],
            subject: `New Dispute Submitted - ${dispute.id}`,
            html: `
              <h2>New Dispute Submitted</h2>
              <p><strong>Dispute ID:</strong> ${dispute.id}</p>
              <p><strong>Name:</strong> ${validatedData.name}</p>
              <p><strong>Email:</strong> ${validatedData.email}</p>
              <p><strong>Description:</strong></p>
              <p>${sanitizedDescription}</p>
              ${validatedData.tradeId ? `<p><strong>Trade ID:</strong> ${validatedData.tradeId}</p>` : ''}
              ${validatedData.orderId ? `<p><strong>Order ID:</strong> ${validatedData.orderId}</p>` : ''}
              ${validatedData.fileUrl ? `<p><strong>File URL:</strong> <a href="${validatedData.fileUrl}">${validatedData.fileUrl}</a></p>` : ''}
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Failed to send email notification:", await emailResponse.text());
        } else {
          console.log("Email notification sent successfully");
        }
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        disputeId: dispute.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in submit-dispute function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
