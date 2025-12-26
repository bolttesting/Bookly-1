// Supabase Edge Function to send SMS reminders
// This is a template - you'll need to integrate with Twilio or another SMS provider

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// SMS provider configuration (Twilio example)
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      customerPhone,
      customerName,
      serviceName,
      businessName,
      appointmentDate,
      appointmentTime,
      hoursBefore,
    } = await req.json();

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("Twilio not configured");
      return new Response(
        JSON.stringify({ 
          error: "SMS service not configured. Please set up Twilio credentials in Supabase Edge Function environment variables.",
          note: "This is a template. SMS functionality requires Twilio integration."
        }),
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

    const message = `Hi ${customerName}, reminder: Your ${serviceName} appointment with ${businessName} is ${reminderText} on ${appointmentDate} at ${appointmentTime}. See you soon!`;

    // Twilio SMS API call
    // Uncomment when Twilio is configured:
    /*
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("From", TWILIO_PHONE_NUMBER);
    formData.append("To", customerPhone);
    formData.append("Body", message);

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!twilioRes.ok) {
      const errorText = await twilioRes.text();
      throw new Error(`Twilio API error: ${errorText}`);
    }

    const twilioData = await twilioRes.json();
    */

    // For now, return success (SMS will be sent when Twilio is configured)
    console.log("SMS reminder (template):", { customerPhone, message });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "SMS reminder template ready. Configure Twilio to enable SMS sending.",
        // messageId: twilioData.sid 
      }),
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

