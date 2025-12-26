import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FollowupEmailRequest {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  businessName: string;
  appointmentDate: string;
  appointmentTime: string;
  staffName?: string;
  bookingUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-followup-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured. RESEND_API_KEY is missing." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const {
      customerEmail,
      customerName,
      serviceName,
      businessName,
      appointmentDate,
      appointmentTime,
      staffName,
      bookingUrl,
    }: FollowupEmailRequest = await req.json();

    console.log("Sending follow-up email to:", customerEmail);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 32px; }
          .greeting { font-size: 18px; color: #18181b; margin-bottom: 16px; }
          .details { background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .detail-label { color: #71717a; font-size: 14px; }
          .detail-value { color: #18181b; font-weight: 600; font-size: 14px; }
          .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
          .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
          .review-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>How Was Your Visit?</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${customerName},</p>
            <p>We hope you had a great experience with us! We'd love to hear your feedback about your recent appointment.</p>
            
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
            
            <div class="review-box">
              <p style="margin: 0; color: #166534; font-weight: 600;">We value your feedback!</p>
              <p style="margin: 8px 0 0 0; color: #15803d;">Your opinion helps us improve our services. If you have a moment, please share your experience with us.</p>
            </div>
            
            ${bookingUrl ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${bookingUrl}" class="button">Book Another Appointment</a>
            </div>
            ` : ''}
            
            <p>Thank you for choosing ${businessName}! We look forward to serving you again soon.</p>
            <p>Best regards,<br>The ${businessName} Team</p>
          </div>
          <div class="footer">
            <p>${businessName}</p>
            <p>This is an automated follow-up email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Bookly <bookly@logixcontact.site>`,
        to: [customerEmail],
        subject: `How was your visit? - ${businessName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await res.json();
    console.log("Follow-up email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending follow-up email:", error);
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

