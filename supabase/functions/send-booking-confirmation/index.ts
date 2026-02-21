// @ts-nocheck - Supabase Edge Function (Deno); IDE may not have Deno types
/**
 * Send booking confirmation email via Resend.
 * Same pattern as send-reschedule-email: business_id + business_email_config, else platform key.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PLATFORM_RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = "Bookly <bookly@logixcontact.site>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookingConfirmationRequest {
  appointmentId: string;
  business_id?: string;
  customerEmail: string;
  customerName: string;
  serviceName: string;
  businessName: string;
  startTime: string;
  staffName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-booking-confirmation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      business_id: businessId,
      customerEmail,
      customerName,
      serviceName,
      businessName,
      startTime,
      staffName,
    }: BookingConfirmationRequest = await req.json();

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
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured. RESEND_API_KEY is missing." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    console.log("Sending confirmation to:", customerEmail);

    const formattedDate = new Date(startTime).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedTime = new Date(startTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

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
          .details { background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .detail-label { color: #71717a; font-size: 14px; }
          .detail-value { color: #18181b; font-weight: 600; font-size: 14px; }
          .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Confirmed!</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${customerName},</p>
            <p>Your appointment has been successfully booked. Here are the details:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Service</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span class="detail-value">${formattedTime}</span>
              </div>
              ${staffName ? `
              <div class="detail-row">
                <span class="detail-label">With</span>
                <span class="detail-value">${staffName}</span>
              </div>
              ` : ''}
            </div>
            
            <p>If you need to reschedule or cancel, please contact us directly.</p>
            <p>We look forward to seeing you!</p>
          </div>
          <div class="footer">
            <p>${businessName}</p>
            <p>This is an automated confirmation email.</p>
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
        subject: `Appointment Confirmed - ${serviceName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
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
