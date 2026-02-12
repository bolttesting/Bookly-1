// Supabase Edge Function to send appointment reminders
// This should be called periodically (via cron job or scheduled task)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    // Get pending reminders that are past due (reminder_time <= now)
    const { data: reminders, error: remindersError } = await supabaseClient
      .from("appointment_reminders")
      .select(`
        *,
        appointments:appointment_id (
          start_time,
          end_time,
          status,
          services:service_id (name, duration),
          customers:customer_id (name, email, phone),
          staff_members:staff_id (name),
          businesses:business_id (name, email, phone)
        )
      `)
      .eq("status", "pending")
      .lte("reminder_time", now.toISOString());

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch reminders" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to send", count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const reminder of reminders) {
      try {
        const appointment = reminder.appointments as any;
        if (!appointment || appointment.status === 'cancelled') {
          // Skip cancelled appointments
          await supabaseClient
            .from("appointment_reminders")
            .update({ status: "cancelled" })
            .eq("id", reminder.id);
          continue;
        }

        const customer = appointment.customers as any;
        const service = appointment.services as any;
        const business = appointment.businesses as any;
        const staff = appointment.staff_members as any;

        // Send email reminder if enabled
        if (
          reminder.reminder_type === "email" ||
          reminder.reminder_type === "both"
        ) {
          if (customer?.email) {
            try {
              await supabaseClient.functions.invoke("send-reminder-email", {
                body: {
                  customerEmail: customer.email,
                  customerName: customer.name,
                  serviceName: service?.name || "Appointment",
                  businessName: business?.name || "Business",
                  appointmentDate: new Date(appointment.start_time).toLocaleDateString(),
                  appointmentTime: new Date(appointment.start_time).toLocaleTimeString(),
                  staffName: staff?.name,
                  hoursBefore: reminder.hours_before,
                },
              });

              successCount++;
            } catch (emailError) {
              console.error("Error sending email reminder:", emailError);
              failCount++;
            }
          }
        }

        // Send SMS reminder if enabled
        if (
          reminder.reminder_type === "sms" ||
          reminder.reminder_type === "both"
        ) {
          if (customer?.phone) {
            try {
              await supabaseClient.functions.invoke("send-reminder-sms", {
                body: {
                  customerPhone: customer.phone,
                  customerName: customer.name,
                  serviceName: service?.name || "Appointment",
                  businessName: business?.name || "Business",
                  appointmentDate: new Date(appointment.start_time).toLocaleDateString(),
                  appointmentTime: new Date(appointment.start_time).toLocaleTimeString(),
                  hoursBefore: reminder.hours_before,
                },
              });

              successCount++;
            } catch (smsError) {
              console.error("Error sending SMS reminder:", smsError);
              failCount++;
            }
          }
        }

        // Update reminder status
        await supabaseClient
          .from("appointment_reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);

        results.push({
          reminder_id: reminder.id,
          status: "sent",
        });
      } catch (error: any) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        
        // Mark as failed
        await supabaseClient
          .from("appointment_reminders")
          .update({
            status: "failed",
            error_message: error.message,
          })
          .eq("id", reminder.id);

        failCount++;
        results.push({
          reminder_id: reminder.id,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Reminders processed",
        total: reminders.length,
        success: successCount,
        failed: failCount,
        results,
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

