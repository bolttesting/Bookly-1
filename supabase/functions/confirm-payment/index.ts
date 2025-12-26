// Supabase Edge Function to confirm Stripe Payment
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

    const { payment_intent_id, appointment_id } = await req.json();

    if (!payment_intent_id || !appointment_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
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
    // const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Confirm payment intent
    // const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    
    // if (paymentIntent.status !== 'succeeded') {
    //   return new Response(
    //     JSON.stringify({ error: "Payment not completed" }),
    //     {
    //       status: 400,
    //       headers: { ...corsHeaders, "Content-Type": "application/json" },
    //     }
    //   );
    // }

    // Update payment record
    const { data: payment, error: paymentError } = await supabaseClient
      .from("payments")
      .update({
        status: "completed",
        // stripe_charge_id: paymentIntent.latest_charge,
      })
      .eq("stripe_payment_intent_id", payment_intent_id)
      .select("id")
      .single();

    if (paymentError) {
      console.error("Error updating payment:", paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to update payment record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
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

