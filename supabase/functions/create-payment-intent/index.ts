// Supabase Edge Function to create Stripe Payment Intent
// This function requires Stripe secret key in environment variables

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { business_id, appointment_id, amount, currency } = await req.json();

    if (!business_id || !appointment_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get business Stripe account
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("stripe_account_id, stripe_connected")
      .eq("id", business_id)
      .single();

    if (businessError || !business?.stripe_connected) {
      return new Response(
        JSON.stringify({ error: "Business Stripe account not connected" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ 
          error: "Stripe not configured. Please set STRIPE_SECRET_KEY in Supabase Edge Function environment variables." 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Import Stripe (you'll need to add this to your Deno imports)
    // For now, this is a template - you'll need to install Stripe SDK
    // const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Create payment intent
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: amount, // Already in cents
    //   currency: currency.toLowerCase(),
    //   metadata: {
    //     business_id,
    //     appointment_id,
    //   },
    //   // Use connected account if available
    //   // application_fee_amount: Math.round(amount * 0.02), // 2% platform fee
    // }, {
    //   stripeAccount: business.stripe_account_id || undefined,
    // });

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .insert({
        business_id,
        appointment_id,
        amount: amount / 100, // Convert back to dollars
        currency: currency.toUpperCase(),
        status: "pending",
        // stripe_payment_intent_id: paymentIntent.id,
      })
      .select("id")
      .single();

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
    }

    // Return payment intent (for now, return mock data)
    return new Response(
      JSON.stringify({
        id: "pi_mock_" + Date.now(), // Replace with paymentIntent.id
        client_secret: "pi_mock_secret", // Replace with paymentIntent.client_secret
        amount: amount / 100,
        currency: currency.toUpperCase(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

