// Supabase Edge Function for Stripe Connect
// Creates a Stripe Connect account for a business and returns onboarding URL
// Deploy: supabase functions deploy stripe-connect
// Set STRIPE_SECRET_KEY and SITE_URL in Supabase Dashboard > Edge Functions > Secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
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
      error: "STRIPE_SECRET_KEY is not configured. Add it in Supabase Dashboard > Project Settings > Edge Functions > Secrets.",
    }, 500);
  }

  try {
    let body: { business_id?: string; email?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const { business_id, email: bodyEmail } = body || {};

    if (!business_id) {
      return jsonResponse({ error: "business_id is required" }, 400);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:8081";

    let ownerEmail = (typeof bodyEmail === "string" && bodyEmail.trim()) ? bodyEmail.trim() : null;

    // Check if business already has Stripe account, and fetch email if needed
    if (supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: biz } = await supabase
        .from("businesses")
        .select("stripe_account_id, email")
        .eq("id", business_id)
        .single();
      if (biz?.stripe_account_id) {
        const accountLink = await stripe.accountLinks.create({
          account: biz.stripe_account_id,
          refresh_url: `${siteUrl}/settings?stripe_refresh=true`,
          return_url: `${siteUrl}/settings?stripe_success=true`,
          type: "account_onboarding",
        });
        return jsonResponse({ account_id: biz.stripe_account_id, url: accountLink.url });
      }
      if (!ownerEmail && biz?.email) ownerEmail = biz.email;
      if (!ownerEmail) {
        const { data: ownerRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("business_id", business_id)
          .eq("role", "owner")
          .limit(1)
          .single();
        if (ownerRole?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", ownerRole.user_id)
            .single();
          if (profile?.email) ownerEmail = profile.email;
        }
      }
    }

    if (!ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      return jsonResponse({
        error: "Valid email is required. Add your email in Profile settings or pass it when connecting.",
      }, 400);
    }

    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: ownerEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${siteUrl}/settings?stripe_refresh=true`,
      return_url: `${siteUrl}/settings?stripe_success=true`,
      type: "account_onboarding",
    });

    if (supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from("businesses").update({
        stripe_account_id: account.id,
        updated_at: new Date().toISOString(),
      }).eq("id", business_id);
    }

    return jsonResponse({ account_id: account.id, url: accountLink.url });
  } catch (error: any) {
    console.error("Stripe connect error:", error);
    return jsonResponse({ error: error?.message || "Stripe connection failed" }, 500);
  }
});

