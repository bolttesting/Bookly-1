// @ts-nocheck - Deno/Edge Runtime
// Creates Stripe Checkout for Bookly subscription plan upgrade (mode=payment).
// Applies platform_subscription_tax_percent from site_settings as a separate line item.

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
    const {
      business_id,
      plan_id,
      success_url,
      cancel_url,
      customer_email,
      customer_name,
    } = body || {};

    if (!business_id || !plan_id) {
      return jsonResponse({ error: "business_id and plan_id are required" }, 400);
    }
    const email = typeof customer_email === "string" ? customer_email.trim() : "";
    if (!email) {
      return jsonResponse({ error: "customer_email is required for invoicing and receipts" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "https://bookly.my";

    const supabase = createClient(supabaseUrl, supabaseServiceKey!);

    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name, price, currency, billing_period")
      .eq("id", plan_id)
      .single();

    if (planError || !plan || Number(plan.price) <= 0) {
      return jsonResponse({ error: "Invalid plan or free plan" }, 400);
    }

    const { data: businessRow } = await supabase
      .from("businesses")
      .select("name, email")
      .eq("id", business_id)
      .single();

    const { data: siteRow } = await supabase
      .from("site_settings")
      .select("platform_subscription_tax_percent")
      .limit(1)
      .maybeSingle();

    const taxPercent = Number(siteRow?.platform_subscription_tax_percent ?? 0);
    const safeTax = Math.min(100, Math.max(0, Number.isFinite(taxPercent) ? taxPercent : 0));

    const subtotalCents = Math.round(Number(plan.price) * 100);
    const taxCents = Math.round((subtotalCents * safeTax) / 100);
    const totalCents = subtotalCents + taxCents;

    const currency = (plan.currency || "usd").toLowerCase();
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2026-01-28.clover",
    });

    const lineItems = [{
      price_data: {
        currency,
        unit_amount: subtotalCents,
        product_data: {
          name: `${plan.name} Plan`,
          description: `Bookly subscription (${plan.billing_period === "year" ? "annual" : "monthly"})`,
        },
      },
      quantity: 1,
    }];

    if (taxCents > 0) {
      lineItems.push({
        price_data: {
          currency,
          unit_amount: taxCents,
          product_data: {
            name: `Tax (${safeTax}%)`,
            description: "Platform subscription tax",
          },
        },
        quantity: 1,
      });
    }

    const nameTrim = typeof customer_name === "string" ? customer_name.trim() : "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      customer_creation: "always",
      line_items: lineItems,
      metadata: {
        business_id,
        plan_id,
        plan_name: plan.name,
        type: "subscription_upgrade",
        subtotal_cents: String(subtotalCents),
        tax_percent: String(safeTax),
        tax_amount_cents: String(taxCents),
        total_cents: String(totalCents),
        account_email: email,
        account_name: nameTrim,
        business_name: businessRow?.name ?? "",
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
