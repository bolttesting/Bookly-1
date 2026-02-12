// Supabase Edge Function for Super Admin Stripe connection
// Verifies STRIPE_SECRET_KEY is configured and returns dashboard link
// Deploy: supabase functions deploy stripe-admin-connect
// Set STRIPE_SECRET_KEY in Supabase Dashboard > Edge Functions > Secrets

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

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
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    await stripe.balance.retrieve();
    const mode = stripeKey.startsWith("sk_live_") ? "live" : "test";
    const dashboardUrl = `https://dashboard.stripe.com${mode === "test" ? "/test" : ""}`;

    return jsonResponse({
      connected: true,
      mode,
      dashboard_url: dashboardUrl,
    });
  } catch (error: any) {
    console.error("Stripe admin connect error:", error);
    return jsonResponse({
      error: error?.message || "Stripe verification failed. Check your STRIPE_SECRET_KEY.",
    }, 500);
  }
});
