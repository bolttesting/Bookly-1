// @ts-nocheck - Deno/Edge Runtime; IDE lacks types but deploys correctly
// Verifies Stripe Checkout session and updates business subscription

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
      apiVersion: "2024-11-20",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid" || session.metadata?.type !== "subscription_upgrade") {
      return jsonResponse({ error: "Invalid or unpaid session" }, 400);
    }

    const { business_id, plan_id, plan_name } = session.metadata || {};
    if (!business_id || !plan_id) {
      return jsonResponse({ error: "Missing metadata" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    const { data: plan } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("id", plan_id)
      .single();

    if (!plan) {
      return jsonResponse({ error: "Plan not found" }, 400);
    }

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

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

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("business_id", business_id)
      .maybeSingle();

    const planName = plan_name || "Premium";
    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          plan_name: planName,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
          stripe_subscription_id: session.subscription as string || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);
    } else {
      await supabase
        .from("subscriptions")
        .insert({
          business_id,
          plan_name: planName,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
        });
    }

    return jsonResponse({ success: true, plan_id });
  } catch (error: any) {
    console.error("Complete subscription checkout error:", error);
    return jsonResponse({ error: error?.message || "Failed to complete subscription" }, 500);
  }
});
