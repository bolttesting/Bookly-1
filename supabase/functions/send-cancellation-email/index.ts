import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CancellationEmailRequest {
  customerEmail: string;
  customerName: string;
  serviceName: string;
  businessName: string;
  appointmentDate: string;
  appointmentTime: string;
  staffName?: string;
  cancellationReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-cancellation-email function called");

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
      cancellationReason,
    }: CancellationEmailRequest = await req.json();

    console.log("Sending cancellation email to:", customerEmail);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { padding: 32px; }
          .greeting { font-size: 18px; color: #18181b; margin-bottom: 16px; }
          .details { background: #f4f4f5; border-radius: 8px; padding: 24px; margin: 24px 0; }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .detail-label { color: #71717a; font-size: 14px; }
          .detail-value { color: #18181b; font-weight: 600; font-size: 14px; }
          .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
          .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Cancelled</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi ${customerName},</p>
            <p>We're sorry to inform you that your appointment has been cancelled.</p>
            
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
            
            ${cancellationReason ? `
            <div class="reason-box">
              <p style="margin: 0; color: #991b1b; font-weight: 600;">Reason:</p>
              <p style="margin: 8px 0 0 0; color: #7f1d1d;">${cancellationReason}</p>
            </div>
            ` : ''}
            
            <p>If you'd like to reschedule, please contact us or book a new appointment through our booking system.</p>
            <p>We apologize for any inconvenience this may cause.</p>
          </div>
          <div class="footer">
            <p>${businessName}</p>
            <p>This is an automated cancellation email.</p>
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
        subject: `Appointment Cancelled - ${serviceName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await res.json();
    console.log("Cancellation email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending cancellation email:", error);
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

