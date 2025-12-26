// Supabase Edge Function to process and send scheduled follow-up emails
// This should be called periodically (via cron job) - recommended: every hour

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not configured");
    return new Response(
      JSON.stringify({ success: false, error: "Email service not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Get pending follow-up emails that are due to be sent (within the next hour)
    const { data: scheduledFollowups, error: followupsError } = await supabaseClient
      .from("scheduled_followup_emails")
      .select(`
        *,
        appointments:appointment_id (
          start_time,
          end_time,
          services:service_id (name),
          staff_members:staff_id (name)
        ),
        customers:customer_id (name, email),
        businesses:business_id (name, slug)
      `)
      .eq("status", "pending")
      .gte("scheduled_send_date", now.toISOString())
      .lte("scheduled_send_date", oneHourFromNow.toISOString());

    if (followupsError) {
      console.error("Error fetching scheduled follow-ups:", followupsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch scheduled follow-ups" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!scheduledFollowups || scheduledFollowups.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No follow-up emails to send", count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const followup of scheduledFollowups) {
      try {
        const appointment = followup.appointments as any;
        const customer = followup.customers as any;
        const business = followup.businesses as any;
        const service = appointment?.services as any;
        const staff = appointment?.staff_members as any;

        if (!customer?.email) {
          console.log(`Skipping follow-up for appointment ${followup.appointment_id}: no customer email`);
          await supabaseClient
            .from("scheduled_followup_emails")
            .update({ status: "cancelled", error_message: "No customer email" })
            .eq("id", followup.id);
          continue;
        }

        // Check if follow-up emails are still enabled for this business
        const { data: reminderSettings } = await supabaseClient
          .from("reminder_settings")
          .select("send_followup_email")
          .eq("business_id", followup.business_id)
          .single();

        if (!reminderSettings?.send_followup_email) {
          console.log(`Skipping follow-up for appointment ${followup.appointment_id}: follow-up emails disabled`);
          await supabaseClient
            .from("scheduled_followup_emails")
            .update({ status: "cancelled", error_message: "Follow-up emails disabled" })
            .eq("id", followup.id);
          continue;
        }

        const appointmentDate = new Date(appointment.start_time);
        const formattedDate = appointmentDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        const bookingUrl = business?.slug 
          ? `${Deno.env.get("PUBLIC_URL") || "https://your-domain.com"}/book/${business.slug}`
          : null;

        // Send follow-up email
        const emailResult = await supabaseClient.functions.invoke("send-followup-email", {
          body: {
            customerEmail: customer.email,
            customerName: customer.name,
            serviceName: service?.name || "Service",
            businessName: business?.name || "Business",
            appointmentDate: formattedDate,
            appointmentTime: formattedTime,
            staffName: staff?.name || null,
            bookingUrl: bookingUrl,
          },
        });

        if (emailResult.error) {
          throw new Error(emailResult.error.message || "Failed to send follow-up email");
        }

        // Update status to sent
        await supabaseClient
          .from("scheduled_followup_emails")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", followup.id);

        successCount++;
        results.push({
          followup_id: followup.id,
          appointment_id: followup.appointment_id,
          status: "sent",
        });
      } catch (error: any) {
        console.error(`Error processing follow-up ${followup.id}:`, error);

        // Mark as failed
        await supabaseClient
          .from("scheduled_followup_emails")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", followup.id);

        failCount++;
        results.push({
          followup_id: followup.id,
          appointment_id: followup.appointment_id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Follow-up emails processed",
        total: scheduledFollowups.length,
        success: successCount,
        failed: failCount,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

