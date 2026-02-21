import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLATFORM_RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = "Bookly <bookly@logixcontact.site>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  business_id?: string;
  customerEmail: string;
  customerName: string;
  businessName: string;
  businessPhone?: string;
  businessAddress?: string;
  bookingUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      business_id: businessId,
      customerEmail,
      customerName,
      businessName,
      businessPhone,
      businessAddress,
      bookingUrl,
    }: WelcomeEmailRequest = await req.json();

    let apiKey = PLATFORM_RESEND_KEY;
    let from = DEFAULT_FROM;

    if (businessId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: emailConfig } = await supabase
        .from("business_email_config")
        .select("from_email, from_name, resend_api_key")
        .eq("business_id", businessId)
        .maybeSingle();
      if (emailConfig?.resend_api_key) {
        apiKey = emailConfig.resend_api_key;
        from = `${emailConfig.from_name || businessName || "Business"} <${emailConfig.from_email}>`;
      }
    }

    if (!apiKey) {
      console.error("No Resend API key (platform or business)");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured. RESEND_API_KEY is missing." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Sending welcome email to:", customerEmail);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 32px; }
          .greeting { font-size: 18px; color: #18181b; margin-bottom: 16px; }
          .info-box { background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0; }
          .info-row { margin-bottom: 12px; }
          .info-label { color: #71717a; font-size: 14px; }
          .info-value { color: #18181b; font-weight: 600; font-size: 14px; margin-top: 4px; }
          .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
          .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${businessName}!</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${customerName},</p>
            <p>Thank you for choosing ${businessName}! We're excited to have you as a customer.</p>
            
            <p>We're here to provide you with the best service possible. If you have any questions or need assistance, please don't hesitate to reach out.</p>
            
            ${bookingUrl ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${bookingUrl}" class="button">Book Another Appointment</a>
            </div>
            ` : ''}
            
            <div class="info-box">
              <p style="margin: 0 0 16px 0; font-weight: 600; color: #18181b;">Contact Information:</p>
              ${businessPhone ? `
              <div class="info-row">
                <span class="info-label">Phone:</span>
                <div class="info-value">${businessPhone}</div>
              </div>
              ` : ''}
              ${businessAddress ? `
              <div class="info-row">
                <span class="info-label">Address:</span>
                <div class="info-value">${businessAddress}</div>
              </div>
              ` : ''}
            </div>
            
            <p>We look forward to serving you!</p>
            <p>Best regards,<br>The ${businessName} Team</p>
          </div>
          <div class="footer">
            <p>${businessName}</p>
            <p>This is an automated welcome email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [customerEmail],
        subject: `Welcome to ${businessName}!`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await res.json();
    console.log("Welcome email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

