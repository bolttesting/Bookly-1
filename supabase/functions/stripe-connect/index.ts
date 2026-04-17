// @ts-nocheck - Deno/Edge Runtime; IDE lacks types but deploys correctly
// Supabase Edge Function for Stripe Connect
// Deploy: supabase functions deploy stripe-connect
// Set in Supabase Dashboard > Project Settings > Edge Functions > Secrets:
//   STRIPE_SECRET_KEY - your Stripe secret key
//   SITE_URL - your app URL (default in code: https://bookly.my); override for staging or http://localhost:8081 locally

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
      error: "STRIPE_SECRET_KEY is not configured. Add it in Supabase Dashboard > Project Settings > Edge Functions > Secrets.",
    }, 500);
  }

  try {
    let body: { action?: string; business_id?: string; email?: string; user_id?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const { action, business_id, email: bodyEmail, user_id: bodyUserId } = body || {};

    if (!business_id) {
      return jsonResponse({ error: "business_id is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse({ error: "Supabase keys are not configured for function authorization." }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header." }, 401);
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return jsonResponse({ error: "Unauthorized request." }, 401);
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2026-01-28.clover",
    });

    const siteUrl = Deno.env.get("SITE_URL") || "https://bookly.my";
    if (!Deno.env.get("SITE_URL")) {
      console.warn("SITE_URL secret not set; using default https://bookly.my. Set SITE_URL in Edge Function secrets for staging or http://localhost:8081 for local.");
    }

    let ownerEmail = (typeof bodyEmail === "string" && bodyEmail.trim()) ? bodyEmail.trim() : null;

    // Check if business already has Stripe account, and fetch email if needed
    if (supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .eq("business_id", business_id)
        .maybeSingle();
      if (!roleRow || !["owner", "admin"].includes(roleRow.role)) {
        return jsonResponse({ error: "Forbidden. Only owners/admins can manage Stripe for this business." }, 403);
      }

      const { data: biz } = await supabase
        .from("businesses")
        .select("stripe_account_id, email")
        .eq("id", business_id)
        .single();
      if (action === "status") {
        if (!biz?.stripe_account_id) {
          await supabase
            .from("businesses")
            .update({
              stripe_connected: false,
              stripe_onboarding_complete: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", business_id);
          return jsonResponse({
            connected: false,
            onboarding_complete: false,
            account_id: null,
            reason: "no_stripe_account",
          });
        }

        const account = await stripe.accounts.retrieve(biz.stripe_account_id);
        const hasRequirementsDue = (account.requirements?.currently_due?.length || 0) > 0;
        const onboardingComplete = Boolean(account.details_submitted) && !hasRequirementsDue;
        const connected = Boolean(account.charges_enabled && account.payouts_enabled);

        await supabase
          .from("businesses")
          .update({
            stripe_connected: connected,
            stripe_onboarding_complete: onboardingComplete,
            updated_at: new Date().toISOString(),
          })
          .eq("id", business_id);

        return jsonResponse({
          connected,
          onboarding_complete: onboardingComplete,
          account_id: biz.stripe_account_id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements_due_count: account.requirements?.currently_due?.length || 0,
        });
      }

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
      if (!ownerEmail && bodyUserId) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(bodyUserId);
        if (authUser?.email) ownerEmail = authUser.email;
      }
      if (!ownerEmail) {
        const { data: ownerRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("business_id", business_id)
          .eq("role", "owner")
          .limit(1)
          .maybeSingle();
        if (ownerRole?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", ownerRole.user_id)
            .maybeSingle();
          if (profile?.email) ownerEmail = profile.email;
          if (!ownerEmail) {
            const { data: { user: authUser } } = await supabase.auth.admin.getUserById(ownerRole.user_id);
            if (authUser?.email) ownerEmail = authUser.email;
          }
        }
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!ownerEmail || !emailRegex.test(ownerEmail)) {
      return jsonResponse({
        error: "Valid email is required. Enter your email in the form above or add it in Profile or Business settings.",
      }, 400);
    }

    // Sanitize: trim, lowercase, remove control chars (Stripe is strict)
    const sanitizedEmail = ownerEmail
      .trim()
      .toLowerCase()
      .replace(/[\x00-\x1F\x7F]/g, "");

    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: sanitizedEmail,
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
    let errMsg = error?.message || "Stripe connection failed";
    if (errMsg.toLowerCase().includes("invalid") && errMsg.toLowerCase().includes("email")) {
      errMsg += " Try a different email - this one may already be linked to another Stripe account or use a non-disposable address.";
    }
    return jsonResponse({ error: errMsg }, 500);
  }
});

