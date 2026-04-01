// @ts-nocheck - Supabase Edge Function (Deno)
/** Send one sample of each transactional email to a chosen inbox (owner/admin only). */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return json({ error: "Invalid session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role, business_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!roleRow?.business_id || !["owner", "admin"].includes(roleRow.role as string)) {
    return json({ error: "Only business owners and admins can run email tests" }, 403);
  }

  let body: { toEmail?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const toEmail = body.toEmail?.trim()?.toLowerCase();
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return json({ error: "Valid toEmail is required" }, 400);
  }

  const businessId = roleRow.business_id as string;
  const site = Deno.env.get("SITE_URL")?.replace(/\/$/, "") || "https://bookly.my";
  const startTime = new Date().toISOString();
  const businessName = "Bookly email test";

  const fnHeaders: Record<string, string> = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: anonKey,
    "Content-Type": "application/json",
  };

  async function callFn(name: string, payload: Record<string, unknown>) {
    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers: fnHeaders,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 500) };
    }
    return {
      function: name,
      ok: res.ok,
      status: res.status,
      body: parsed,
    };
  }

  const results = [];

  results.push(
    await callFn("send-booking-confirmation", {
      appointmentId: "00000000-0000-0000-0000-000000000001",
      business_id: businessId,
      customerEmail: toEmail,
      customerName: "Test Customer",
      serviceName: "Test Service",
      businessName,
      startTime,
      staffName: "Test Staff",
    }),
  );

  results.push(
    await callFn("send-cancellation-email", {
      business_id: businessId,
      customerEmail: toEmail,
      customerName: "Test Customer",
      serviceName: "Test Service",
      businessName,
      appointmentDate: "Monday, January 1, 2026",
      appointmentTime: "10:00 AM",
      staffName: "Test Staff",
      cancellationReason: "[TEST] Sample cancellation reason",
    }),
  );

  results.push(
    await callFn("send-reschedule-email", {
      business_id: businessId,
      customerEmail: toEmail,
      customerName: "Test Customer",
      serviceName: "Test Service",
      businessName,
      oldDate: "Monday, January 1, 2026",
      oldTime: "9:00 AM",
      newDate: "Tuesday, January 2, 2026",
      newTime: "2:00 PM",
      staffName: "Test Staff",
      rescheduleReason: "[TEST] Sample reschedule",
    }),
  );

  results.push(
    await callFn("send-reminder-email", {
      business_id: businessId,
      customerEmail: toEmail,
      customerName: "Test Customer",
      serviceName: "Test Service",
      businessName,
      appointmentDate: "Monday, January 1, 2026",
      appointmentTime: "10:00 AM",
      staffName: "Test Staff",
      hoursBefore: 24,
    }),
  );

  results.push(
    await callFn("send-welcome-email", {
      business_id: businessId,
      customerEmail: toEmail,
      customerName: "Test Customer",
      businessName,
      businessPhone: "+1234567890",
      businessAddress: "123 Test Street",
      bookingUrl: `${site}/book/demo-slug`,
    }),
  );

  results.push(
    await callFn("send-followup-email", {
      business_id: businessId,
      customerEmail: toEmail,
      customerName: "Test Customer",
      serviceName: "Test Service",
      businessName,
      appointmentDate: "Monday, January 1, 2026",
      appointmentTime: "10:00 AM",
      staffName: "Test Staff",
      bookingUrl: `${site}/book/demo-slug`,
    }),
  );

  results.push(
    await callFn("send-team-invitation", {
      business_id: businessId,
      inviteeEmail: toEmail,
      businessName,
      inviterEmail: user.email ?? "owner@example.com",
      inviterName: "Test Owner",
      role: "staff",
      acceptUrl: `${site}/accept-invite?token=test`,
    }),
  );

  results.push(
    await callFn("send-daily-summary", {
      business_id: businessId,
      businessEmail: toEmail,
      businessName,
      appointmentDate: "Monday, January 1, 2026",
      appointments: [
        { time: "9:00 AM", customerName: "Alice", serviceName: "Haircut", status: "confirmed" },
        { time: "11:00 AM", customerName: "Bob", serviceName: "Color", status: "pending" },
      ],
      totalCount: 2,
    }),
  );

  const failed = results.filter((r) => !r.ok);
  return json({
    success: failed.length === 0,
    toEmail,
    sent: results.length,
    failedCount: failed.length,
    results,
  });
});
