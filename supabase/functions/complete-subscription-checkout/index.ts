// @ts-nocheck - Deno/Edge Runtime
// Verifies Stripe Checkout session and updates business subscription + platform_subscription_invoices

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey || !stripeKey.startsWith("sk_")) {
    return jsonResponse({ error: "STRIPE_SECRET_KEY is not configured." }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { session_id } = body || {};

    if (!session_id) {
      return jsonResponse({ error: "session_id is required" }, 400);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2026-01-28.clover",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["payment_intent.latest_charge", "customer"],
    });

    if (session.payment_status !== "paid" || session.metadata?.type !== "subscription_upgrade") {
      return jsonResponse({ error: "Invalid or unpaid session" }, 400);
    }

    const { business_id, plan_id, plan_name } = session.metadata || {};
    if (!business_id || !plan_id) {
      return jsonResponse({ error: "Missing metadata" }, 400);
    }

    const metaTotal = parseInt(session.metadata?.total_cents ?? "", 10);
    if (Number.isFinite(metaTotal) && session.amount_total != null && session.amount_total !== metaTotal) {
      console.warn("Checkout amount_total mismatch vs metadata", session.amount_total, metaTotal);
    }

    const subtotalCents = parseInt(session.metadata?.subtotal_cents ?? "0", 10) || 0;
    const taxPercent = parseFloat(session.metadata?.tax_percent ?? "0") || 0;
    const taxAmountCents = parseInt(session.metadata?.tax_amount_cents ?? "0", 10) || 0;
    const totalCents = session.amount_total ?? (subtotalCents + taxAmountCents);

    const pi = session.payment_intent;
    const piId = typeof pi === "string" ? pi : pi?.id ?? null;
    let chargeId: string | null = null;
    let receiptUrl: string | null = null;
    if (pi && typeof pi === "object" && pi.latest_charge) {
      const ch = pi.latest_charge;
      if (typeof ch === "object" && ch) {
        chargeId = ch.id ?? null;
        receiptUrl = ch.receipt_url ?? null;
      } else if (typeof ch === "string") {
        chargeId = ch;
      }
    }

    const customerId = typeof session.customer === "string"
      ? session.customer
      : (session.customer && typeof session.customer === "object" ? session.customer.id : null);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id, billing_period")
      .eq("id", plan_id)
      .single();

    if (!plan) {
      return jsonResponse({ error: "Plan not found" }, 400);
    }

    const periodStart = new Date();
    const months = plan.billing_period === "year" ? 12 : 1;
    const periodEnd = addMonths(periodStart, months);

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        subscription_plan_id: plan_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", business_id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    const accountEmail = session.metadata?.account_email || session.customer_details?.email || null;
    const accountName = session.metadata?.account_name || session.customer_details?.name || null;
    const businessName = session.metadata?.business_name || null;

    const { error: invError } = await supabase.from("platform_subscription_invoices").insert({
      business_id,
      subscription_plan_id: plan_id,
      plan_name: plan_name || "Plan",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: piId,
      stripe_charge_id: chargeId,
      stripe_customer_id: customerId,
      receipt_url: receiptUrl,
      billing_period_start: periodStart.toISOString(),
      billing_period_end: periodEnd.toISOString(),
      subtotal_cents: subtotalCents,
      tax_percent: taxPercent,
      tax_amount_cents: taxAmountCents,
      total_cents: totalCents,
      currency: (session.currency || "usd").toLowerCase(),
      account_name: accountName,
      account_email: accountEmail,
      business_name: businessName,
      paid_at: new Date().toISOString(),
    });

    if (invError) {
      if (invError.code === "23505") {
        // duplicate session — idempotent success
        return jsonResponse({ success: true, plan_id, duplicate: true });
      }
      console.error("platform_subscription_invoices insert:", invError);
      return jsonResponse({ error: invError.message }, 500);
    }

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("business_id", business_id)
      .maybeSingle();

    const planLabel = plan_name || "Premium";
    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          plan_name: planLabel,
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          stripe_subscription_id: session.subscription as string || null,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);
    } else {
      await supabase
        .from("subscriptions")
        .insert({
          business_id,
          plan_name: planLabel,
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          stripe_subscription_id: session.subscription as string || null,
          stripe_customer_id: customerId,
        });
    }

    return jsonResponse({ success: true, plan_id });
  } catch (error: any) {
    console.error("Complete subscription checkout error:", error);
    return jsonResponse({ error: error?.message || "Failed to complete subscription" }, 500);
  }
});
