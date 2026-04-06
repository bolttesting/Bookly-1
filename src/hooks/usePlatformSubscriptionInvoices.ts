import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformSubscriptionInvoice {
  id: string;
  business_id: string;
  subscription_plan_id: string | null;
  plan_name: string;
  stripe_checkout_session_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_customer_id: string | null;
  receipt_url: string | null;
  billing_period_start: string;
  billing_period_end: string;
  subtotal_cents: number;
  tax_percent: number;
  tax_amount_cents: number;
  total_cents: number;
  currency: string;
  account_name: string | null;
  account_email: string | null;
  business_name: string | null;
  paid_at: string;
  created_at: string;
}

export function usePlatformSubscriptionInvoices(businessId: string | undefined) {
  return useQuery({
    queryKey: ['platformSubscriptionInvoices', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('platform_subscription_invoices')
        .select('*')
        .eq('business_id', businessId)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as PlatformSubscriptionInvoice[];
    },
    enabled: !!businessId,
    staleTime: 60_000,
  });
}
