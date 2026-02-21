// Process and send daily summary emails to businesses
// Call via cron daily (e.g. 7 AM)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Get target date from body or use today
    let targetDate = new Date();
    try {
      const body = await req.json().catch(() => ({}));
      if (body.date) {
        targetDate = new Date(body.date);
      }
    } catch {
      // Use today
    }

    const formattedDate = targetDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Get businesses with daily summary enabled
    const { data: businesses, error: bizError } = await supabaseClient
      .from("reminder_settings")
      .select("business_id")
      .eq("notify_daily_summary", true);

    if (bizError || !businesses?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No businesses with daily summary enabled", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const { business_id } of businesses) {
      try {
        // Get business details and owner emails
        const { data: business, error: bizErr } = await supabaseClient
          .from("businesses")
          .select("id, name, email")
          .eq("id", business_id)
          .single();

        if (bizErr || !business) continue;

        // Use business email; fallback to first team member from profiles
        let toEmail = business.email;
        if (!toEmail) {
          const { data: role } = await supabaseClient
            .from("user_roles")
            .select("user_id")
            .eq("business_id", business_id)
            .limit(1)
            .maybeSingle();
          if (role?.user_id) {
            const { data: profile } = await supabaseClient
              .from("profiles")
              .select("email")
              .eq("id", role.user_id)
              .maybeSingle();
            toEmail = (profile as any)?.email;
          }
        }
        if (!toEmail) continue;

        // Get appointments for the date
        const dayStart = new Date(targetDate);
        dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setUTCHours(23, 59, 59, 999);

        const { data: appointments } = await supabaseClient
          .from("appointments")
          .select(`
            start_time,
            status,
            customers:customer_id (name),
            services:service_id (name)
          `)
          .eq("business_id", business_id)
          .gte("start_time", dayStart.toISOString())
          .lte("start_time", dayEnd.toISOString())
          .in("status", ["confirmed", "pending", "completed"])
          .order("start_time", { ascending: true });

        const appointmentList = (appointments || []).map((a: any) => ({
          time: new Date(a.start_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          customerName: a.customers?.name || "—",
          serviceName: a.services?.name || "—",
          status: a.status,
        }));

        const { error: emailErr } = await supabaseClient.functions.invoke("send-daily-summary", {
          body: {
            business_id,
            businessEmail: toEmail,
            businessName: business.name || "Business",
            appointmentDate: formattedDate,
            appointments: appointmentList,
            totalCount: appointmentList.length,
          },
        });

        if (emailErr) throw emailErr;
        successCount++;
        results.push({ business_id, email: toEmail, status: "sent", count: appointmentList.length });
      } catch (err: any) {
        console.error(`Daily summary for ${business_id}:`, err);
        failCount++;
        results.push({ business_id, status: "failed", error: err.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily summaries processed",
        total: businesses.length,
        sent: successCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("process-daily-summaries error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
