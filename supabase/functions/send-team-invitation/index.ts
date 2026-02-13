import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamInvitationRequest {
  inviteeEmail: string;
  businessName: string;
  inviterEmail: string;
  inviterName?: string;
  role: string;
  acceptUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured. RESEND_API_KEY is missing." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const {
      inviteeEmail,
      businessName,
      inviterEmail,
      inviterName,
      role,
      acceptUrl,
    }: TeamInvitationRequest = await req.json();

    const inviterDisplay = inviterName || inviterEmail;
    const roleLabel = role === "admin" ? "Administrator" : role === "staff" ? "Staff" : role;

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
          .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited to Join ${businessName}</h1>
          </div>
          <div class="content">
            <p class="greeting">Hi,</p>
            <p><strong>${inviterDisplay}</strong> has invited you to join <strong>${businessName}</strong> as a <strong>${roleLabel}</strong> on Bookly.</p>
            <p>Bookly helps businesses manage appointments, staff, and customers. Click the button below to accept the invitation and get started.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${acceptUrl}" class="button">Accept Invitation</a>
            </div>
            <p style="color: #71717a; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this invite, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>Bookly – Smart Scheduling</p>
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
        from: "Bookly <bookly@logixcontact.site>",
        to: [inviteeEmail],
        subject: `You're invited to join ${businessName} on Bookly`,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending team invitation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
