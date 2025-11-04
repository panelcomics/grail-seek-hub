import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShippingNotificationRequest {
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId }: ShippingNotificationRequest = await req.json();

    console.log("Sending shipping notification for order:", orderId);

    // Fetch order details with related data
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        claim_sales!inner (
          title,
          description
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Error fetching order:", orderError);
      throw new Error("Order not found");
    }

    // Fetch buyer profile (to get username)
    const { data: buyerProfile, error: buyerError } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", order.buyer_id)
      .single();

    // Fetch seller profile
    const { data: sellerProfile, error: sellerError } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", order.seller_id)
      .single();

    // Get buyer's email from auth.users (using service role)
    const { data: { user: buyerAuth }, error: authError } = await supabase.auth.admin.getUserById(order.buyer_id);

    if (authError || !buyerAuth?.email) {
      console.error("Error fetching buyer email:", authError);
      throw new Error("Buyer email not found");
    }

    const buyerEmail = buyerAuth.email;
    const buyerUsername = buyerProfile?.username || "Buyer";
    const sellerUsername = sellerProfile?.username || "Seller";
    const itemTitle = order.claim_sales?.title || "Item";

    // Generate tracking URL
    const getTrackingUrl = (carrier: string, trackingNumber: string) => {
      switch (carrier) {
        case "USPS":
          return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
        case "UPS":
          return `https://www.ups.com/track?tracknum=${trackingNumber}`;
        case "FedEx":
          return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
        default:
          return null;
      }
    };

    const trackingUrl = getTrackingUrl(order.carrier, order.tracking_number);

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px 20px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-top: none;
              padding: 30px 20px;
              border-radius: 0 0 8px 8px;
            }
            .tracking-box {
              background: #f9fafb;
              border: 2px solid #667eea;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              text-align: center;
            }
            .tracking-number {
              font-family: monospace;
              font-size: 18px;
              font-weight: bold;
              color: #667eea;
              background: white;
              padding: 10px 15px;
              border-radius: 4px;
              display: inline-block;
              margin: 10px 0;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 15px 0;
            }
            .order-summary {
              background: #f9fafb;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .order-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .order-row:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 18px;
              margin-top: 10px;
              padding-top: 15px;
              border-top: 2px solid #667eea;
            }
            .protection-badge {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📦 Your Item Has Shipped!</h1>
          </div>
          
          <div class="content">
            <p>Hi ${buyerUsername},</p>
            
            <p>Great news! Your order from <strong>${sellerUsername}</strong> on Grail Seeker has shipped and is on its way to you.</p>
            
            <div class="tracking-box">
              <p style="margin: 0 0 10px 0; font-weight: 600;">Carrier</p>
              <p style="margin: 0; font-size: 20px;">
                ${order.carrier === "USPS" ? "🇺🇸" : order.carrier === "UPS" ? "📦" : order.carrier === "FedEx" ? "✈️" : "🚚"}
                <strong>${order.carrier}</strong>
              </p>
              
              <p style="margin: 20px 0 10px 0; font-weight: 600;">Tracking Number</p>
              <div class="tracking-number">${order.tracking_number}</div>
              
              ${trackingUrl ? `
                <a href="${trackingUrl}" class="button">Track Your Package</a>
              ` : ''}
            </div>
            
            <div class="order-summary">
              <h3 style="margin-top: 0;">Order Summary</h3>
              <p><strong>${itemTitle}</strong></p>
              
              <div class="order-row">
                <span>Item Price</span>
                <span>$${order.amount.toFixed(2)}</span>
              </div>
              <div class="order-row">
                <span>Shipping</span>
                <span>$${order.shipping_amount.toFixed(2)}</span>
              </div>
              <div class="order-row">
                <span>Buyer Protection</span>
                <span>$${order.buyer_protection_fee.toFixed(2)}</span>
              </div>
              <div class="order-row">
                <span>Total</span>
                <span>$${order.total.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="protection-badge">
              <p style="margin: 0; font-weight: 600; font-size: 16px;">🛡️ Protected by Grail Seeker</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">
                Your purchase is covered by buyer protection
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              If you have any questions about your shipment, you can contact the seller through the Grail Seeker messaging system.
            </p>
          </div>
          
          <div class="footer">
            <p>This email was sent by Grail Seeker</p>
            <p>Questions? Contact us at support@grailseeker.com</p>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Grail Seeker <onboarding@resend.dev>",
      to: [buyerEmail],
      subject: `Your item has shipped from ${sellerUsername} on Grail Seeker`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-shipping-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
