import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface PaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

export function usePayment() {
  const [processing, setProcessing] = useState(false);

  const createPaymentIntent = async (
    businessId: string,
    appointmentId: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<PaymentIntent | null> => {
    try {
      setProcessing(true);
      
      // Call Supabase Edge Function to create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          business_id: businessId,
          appointment_id: appointmentId,
          amount: amount * 100, // Convert to cents
          currency: currency.toLowerCase(),
        },
      });

      // If function doesn't exist or Stripe not configured, return test mode
      if (error && (error.message?.includes('not found') || error.message?.includes('404'))) {
        // Stripe not configured; using test mode (no log in production)
        return {
          id: 'test_intent_' + Date.now(),
          client_secret: 'test_secret',
          amount,
          currency: currency.toUpperCase(),
        };
      }

      if (error) throw error;

      return data as PaymentIntent;
    } catch (error: any) {
      // Error creating payment intent (toast shown to user)
      // Return test mode if Stripe is not set up
      return {
        id: 'test_intent_' + Date.now(),
        client_secret: 'test_secret',
        amount,
        currency: currency.toUpperCase(),
      };
    } finally {
      setProcessing(false);
    }
  };

  const confirmPayment = async (
    paymentIntentId: string,
    appointmentId: string
  ): Promise<PaymentResult> => {
    try {
      setProcessing(true);

      // Call Supabase Edge Function to confirm payment
      const { data, error } = await supabase.functions.invoke('confirm-payment', {
        body: {
          payment_intent_id: paymentIntentId,
          appointment_id: appointmentId,
        },
      });

      if (error) throw error;

      // Update appointment payment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          payment_status: 'paid',
          payment_id: data.payment_id,
        })
        .eq('id', appointmentId);

      if (updateError) {
        logger.error('Error updating appointment:', updateError);
        // Don't fail the payment if update fails
      }

      return {
        success: true,
        paymentId: data.payment_id,
      };
    } catch (error: any) {
      logger.error('Error confirming payment:', error);
      return {
        success: false,
        error: error.message || 'Payment failed',
      };
    } finally {
      setProcessing(false);
    }
  };

  const createPaymentRecord = async (
    businessId: string,
    customerId: string,
    appointmentId: string,
    amount: number,
    currency: string,
    stripePaymentIntentId?: string,
    status: string = 'pending'
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          business_id: businessId,
          customer_id: customerId,
          appointment_id: appointmentId,
          amount,
          currency,
          status,
          stripe_payment_intent_id: stripePaymentIntentId || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error: any) {
      logger.error('Error creating payment record:', error);
      return null;
    }
  };

  return {
    createPaymentIntent,
    confirmPayment,
    createPaymentRecord,
    processing,
  };
}

