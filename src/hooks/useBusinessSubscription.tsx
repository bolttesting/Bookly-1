import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useBusiness } from './useBusiness';
import { useSubscriptionPlans } from './useSubscriptionPlans';
import { toast } from 'sonner';

export interface BusinessSubscription {
  plan: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    billing_period: 'month' | 'year';
    features: string[];
    max_appointments: number | null;
    max_staff: number | null;
  } | null;
  currentAppointments: number;
  currentStaff: number;
  canUpgrade: boolean;
  canDowngrade: boolean;
}

export function useBusinessSubscription() {
  const { business } = useBusiness();
  const { plans } = useSubscriptionPlans();
  const queryClient = useQueryClient();

  // Get current subscription details
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['business-subscription', business?.id],
    queryFn: async (): Promise<BusinessSubscription> => {
      if (!business) {
        return {
          plan: null,
          currentAppointments: 0,
          currentStaff: 0,
          canUpgrade: false,
          canDowngrade: false,
        };
      }

      // Get current plan
      let currentPlan = null;
      if (business.subscription_plan_id) {
        const plan = plans.find(p => p.id === business.subscription_plan_id);
        if (plan) {
          currentPlan = {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            price: plan.price,
            currency: plan.currency,
            billing_period: plan.billing_period,
            features: plan.features,
            max_appointments: plan.max_appointments,
            max_staff: plan.max_staff,
          };
        }
      }

      // Get current appointment count (this month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('created_at', startOfMonth.toISOString());

      // Get current staff count
      const { count: staffCount } = await supabase
        .from('staff_members')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id);

      const currentAppointments = appointmentsCount || 0;
      const currentStaff = staffCount || 0;

      // Check if can upgrade/downgrade
      const currentPlanIndex = currentPlan
        ? plans.findIndex(p => p.id === currentPlan.id)
        : -1;
      const canUpgrade = currentPlanIndex < plans.length - 1;
      const canDowngrade = currentPlanIndex > 0;

      return {
        plan: currentPlan,
        currentAppointments,
        currentStaff,
        canUpgrade,
        canDowngrade,
      };
    },
    enabled: !!business && plans.length > 0,
  });

  // Upgrade/downgrade subscription
  const updateSubscription = useMutation({
    mutationFn: async (planId: string) => {
      if (!business) throw new Error('Business not found');

      // Get the plan details
      const plan = plans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      // Get current subscription data for validation
      const currentSubscription = subscription || {
        plan: null,
        currentAppointments: 0,
        currentStaff: 0,
        canUpgrade: false,
        canDowngrade: false,
      };

      // Check if payment is required (paid upgrade)
      const isUpgrade = !currentSubscription.plan || plan.price > (currentSubscription.plan.price || 0);
      const requiresPayment = plan.price > 0 && isUpgrade;

      // If paid upgrade, redirect to Stripe Checkout
      if (requiresPayment) {
        const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
          body: {
            business_id: business.id,
            plan_id: planId,
            success_url: `${siteUrl}/settings?tab=payments&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/settings?tab=payments&checkout=cancelled`,
          },
        });
        let errMsg = data?.error || error?.message || 'Failed to create checkout';
        if (error instanceof FunctionsHttpError && error.context) {
          try {
            const body = await error.context.json();
            if (body?.error) errMsg = body.error;
          } catch {}
        }
        if (error) throw new Error(errMsg);
        if (!data?.url) throw new Error('Payment not configured. Add STRIPE_SECRET_KEY in Supabase Edge Function Secrets.');
        window.location.href = data.url;
        return; // Redirect in progress
      }

      // Validate limits if downgrading
      if (plan.max_appointments !== null && currentSubscription.currentAppointments > plan.max_appointments) {
        throw new Error(
          `Cannot downgrade: You have ${currentSubscription.currentAppointments} appointments this month, but the selected plan allows only ${plan.max_appointments} appointments/month.`
        );
      }

      if (plan.max_staff !== null && currentSubscription.currentStaff > plan.max_staff) {
        throw new Error(
          `Cannot downgrade: You have ${currentSubscription.currentStaff} staff members, but the selected plan allows only ${plan.max_staff} staff members.`
        );
      }

      // Update business subscription (only if no payment required or free plan)
      const { error } = await supabase
        .from('businesses')
        .update({ subscription_plan_id: planId })
        .eq('id', business.id);

      if (error) throw error;

      // Create or update subscription record (for Stripe integration later)
      // First check if subscription exists
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('business_id', business.id)
        .maybeSingle();

      const periodEnd = new Date(
        plan.billing_period === 'month'
          ? Date.now() + 30 * 24 * 60 * 60 * 1000
          : Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString();

      if (existingSub) {
        // Update existing subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            plan_name: plan.name,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
            cancel_at_period_end: false,
          })
          .eq('id', existingSub.id);

        if (subError) {
          console.error('Error updating subscription record:', subError);
          // Don't throw - subscription update succeeded
        }
      } else {
        // Create new subscription
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            business_id: business.id,
            plan_name: plan.name,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd,
          });

        if (subError) {
          console.error('Error creating subscription record:', subError);
          // Don't throw - subscription update succeeded
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('Subscription updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subscription');
    },
  });

  return {
    subscription: subscription || {
      plan: null,
      currentAppointments: 0,
      currentStaff: 0,
      canUpgrade: false,
      canDowngrade: false,
    },
    isLoading,
    updateSubscription,
  };
}

