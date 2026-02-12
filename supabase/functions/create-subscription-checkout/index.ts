// @ts-nocheck - Deno/Edge Runtime; IDE lacks types but deploys correctly
// Creates Stripe Checkout session for subscription plan upgrade
// Set STRIPE_SECRET_KEY and SITE_URL in Supabase Edge Function Secrets

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
    return jsonResponse({
      error: "STRIPE_SECRET_KEY is not configured.",
    }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { business_id, plan_id, success_url, cancel_url } = body || {};

    if (!business_id || !plan_id) {
      return jsonResponse({ error: "business_id and plan_id are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:8081";

    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name, price, currency")
      .eq("id", plan_id)
      .single();

    if (planError || !plan || Number(plan.price) <= 0) {
      return jsonResponse({ error: "Invalid plan or free plan" }, 400);
    }

    const amountCents = Math.round(Number(plan.price) * 100);
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2026-01-28.clover",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: (plan.currency || "usd").toLowerCase(),
          unit_amount: amountCents,
          product_data: {
            name: `${plan.name} Plan`,
            description: `Subscription plan upgrade`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        business_id,
        plan_id,
        plan_name: plan.name,
        type: "subscription_upgrade",
      },
      success_url: success_url || `${siteUrl}/settings?tab=payments&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${siteUrl}/settings?tab=payments&checkout=cancelled`,
    });

    return jsonResponse({ url: session.url, session_id: session.id });
  } catch (error: any) {
    console.error("Create subscription checkout error:", error);
    return jsonResponse({ error: error?.message || "Checkout creation failed" }, 500);
  }
});
