import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RescheduleEmailRequest {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  businessName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  staffName?: string;
  rescheduleReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-reschedule-email function called");

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
      oldDate,
      oldTime,
      newDate,
      newTime,
      staffName,
      rescheduleReason,
    }: RescheduleEmailRequest = await req.json();

    console.log("Sending reschedule email to:", customerEmail);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 32px; }
          .greeting { font-size: 18px; color: #18181b; margin-bottom: 16px; }
          .details { background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .detail-label { color: #71717a; font-size: 14px; }
          .detail-value { color: #18181b; font-weight: 600; font-size: 14px; }
          .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
          .change-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0; border-radius: 4px; }
          .old-time { text-decoration: line-through; color: #71717a; }
          .new-time { color: #d97706; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Rescheduled</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${customerName},</p>
            <p>Your appointment has been rescheduled. Here are the updated details:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Service</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              ${staffName ? `
              <div class="detail-row">
                <span class="detail-label">With</span>
                <span class="detail-value">${staffName}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="change-box">
              <p style="margin: 0 0 12px 0; color: #92400e; font-weight: 600;">Schedule Change:</p>
              <div style="margin-bottom: 8px;">
                <span style="color: #71717a; font-size: 14px;">Previous: </span>
                <span class="old-time">${oldDate} at ${oldTime}</span>
              </div>
              <div>
                <span style="color: #92400e; font-size: 14px; font-weight: 600;">New Time: </span>
                <span class="new-time">${newDate} at ${newTime}</span>
              </div>
            </div>
            
            ${rescheduleReason ? `
            <p style="color: #71717a; font-size: 14px;"><strong>Reason:</strong> ${rescheduleReason}</p>
            ` : ''}
            
            <p>Please make a note of the new appointment time. If you need to make any changes, please contact us as soon as possible.</p>
            <p>We look forward to seeing you at the new time!</p>
          </div>
          <div class="footer">
            <p>${businessName}</p>
            <p>This is an automated reschedule notification email.</p>
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
        subject: `Appointment Rescheduled - ${serviceName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await res.json();
    console.log("Reschedule email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending reschedule email:", error);
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

