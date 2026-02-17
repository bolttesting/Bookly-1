// Supabase Edge Function to send reminder emails
// Uses business's own Resend if configured, else platform RESEND_API_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const DEFAULT_FROM = "Bookly <bookly@logixcontact.site>";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      business_id: businessId,
      customerEmail,
      customerName,
      serviceName,
      businessName,
      appointmentDate,
      appointmentTime,
      staffName,
      hoursBefore,
    } = await req.json();

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
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const reminderText = hoursBefore === 24 
      ? "tomorrow" 
      : hoursBefore === 2 
      ? "in 2 hours"
      : `in ${hoursBefore} hours`;

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
          .reminder-badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Reminder</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${customerName},</p>
            <div class="reminder-badge">Reminder: ${reminderText}</div>
            <p>This is a friendly reminder about your upcoming appointment:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Service</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date</span>
                <span class="detail-value">${appointmentDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time</span>
                <span class="detail-value">${appointmentTime}</span>
              </div>
              ${staffName ? `
              <div class="detail-row">
                <span class="detail-label">With</span>
                <span class="detail-value">${staffName}</span>
              </div>
              ` : ''}
            </div>
            
            <p>We look forward to seeing you!</p>
            <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
          </div>
          <div class="footer">
            <p>${businessName}</p>
            <p>This is an automated reminder email.</p>
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
        subject: `Reminder: Your appointment ${reminderText} - ${serviceName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await res.json();
    console.log("Reminder email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

