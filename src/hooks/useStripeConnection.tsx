import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StripeConnectionStatus {
  isConnected: boolean;
  stripeAccountId: string | null;
  stripePublishableKey: string | null;
}

export function useStripeConnection() {
  const { data: status, isLoading } = useQuery({
    queryKey: ['stripe-connection'],
    queryFn: async (): Promise<StripeConnectionStatus> => {
      const { data, error } = await supabase
        .from('super_admin_settings')
        .select('stripe_connected, stripe_account_id, stripe_publishable_key')
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .maybeSingle();

      if (error) {
        console.error('Error fetching Stripe connection status:', error);
        return {
          isConnected: false,
          stripeAccountId: null,
          stripePublishableKey: null,
        };
      }

      return {
        isConnected: data?.stripe_connected || false,
        stripeAccountId: data?.stripe_account_id || null,
        stripePublishableKey: data?.stripe_publishable_key || null,
      };
    },
  });

  return {
    stripeConnected: status?.isConnected || false,
    stripeAccountId: status?.stripeAccountId || null,
    stripePublishableKey: status?.stripePublishableKey || null,
    isLoading,
  };
}

