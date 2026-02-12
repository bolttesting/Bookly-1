// Send daily booking summary email to business owners/admins

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DailySummaryRequest {
  businessEmail: string;
  businessName: string;
  appointmentDate: string;
  appointments: {
    time: string;
    customerName: string;
    serviceName: string;
    status: string;
  }[];
  totalCount: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  try {
    const {
      businessEmail,
      businessName,
      appointmentDate,
      appointments,
      totalCount,
    }: DailySummaryRequest = await req.json();

    if (!businessEmail) {
      return new Response(
        JSON.stringify({ success: false, error: "businessEmail required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const rowsHtml = (appointments || [])
      .map(
        (a) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">${a.time}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">${a.customerName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">${a.serviceName}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e4e4e7;">${a.status}</td>
        </tr>
      `,
      )
      .join("");

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
          table { width: 100%; border-collapse: collapse; margin: 24px 0; }
          th { padding: 12px; text-align: left; background: #f4f4f5; font-weight: 600; color: #71717a; }
          .footer { text-align: center; padding: 24px; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Daily Booking Summary</h1>
          </div>
          <div class="content">
            <p>Hi ${businessName},</p>
            <p>Here's your booking summary for <strong>${appointmentDate}</strong>:</p>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || "<tr><td colspan='4' style='padding: 24px; text-align: center; color: #71717a;'>No appointments scheduled</td></tr>"}
              </tbody>
            </table>
            <p><strong>Total: ${totalCount} appointment${totalCount !== 1 ? "s" : ""}</strong></p>
            <p>Log in to your dashboard to manage appointments.</p>
          </div>
          <div class="footer">
            <p>${businessName}</p>
            <p>This is an automated daily summary from Bookly.</p>
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
        to: [businessEmail],
        subject: `Daily Summary - ${appointmentDate} | ${businessName}`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending daily summary:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
