// Supabase Edge Function for Stripe Connect
// This function creates a Stripe Connect account and returns an onboarding URL
// 
// To deploy: npx supabase functions deploy stripe-connect
// 
// Required environment variables in Supabase Dashboard:
// - STRIPE_SECRET_KEY: Your Stripe secret key (sk_test_... or sk_live_...)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { business_id } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US", // Change to your default country
      email: "", // You can get this from the business record
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${Deno.env.get("SITE_URL") || "http://localhost:8081"}/settings?stripe_refresh=true`,
      return_url: `${Deno.env.get("SITE_URL") || "http://localhost:8081"}/settings?stripe_success=true`,
      type: "account_onboarding",
    });

    // Update the business record in Supabase
    // Note: You'll need to use the Supabase client here to update the database
    // For now, we'll just return the account ID and onboarding URL
    // You should update the business record with the account ID after successful onboarding

    return new Response(
      JSON.stringify({
        account_id: account.id,
        url: accountLink.url,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

