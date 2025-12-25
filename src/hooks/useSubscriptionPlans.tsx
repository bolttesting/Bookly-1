import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: 'month' | 'year';
  features: string[];
  max_appointments: number | null;
  max_staff: number | null;
  is_popular: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlanFormData {
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  billing_period: 'month' | 'year';
  features: string[];
  max_appointments?: number | null;
  max_staff?: number | null;
  is_popular?: boolean;
  is_active?: boolean;
  display_order?: number;
}

export function useSubscriptionPlans() {
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data || []) as SubscriptionPlan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (formData: SubscriptionPlanFormData) => {
      const { data, error } = await (supabase as any)
        .from('subscription_plans')
        .insert({
          ...formData,
          features: formData.features || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Subscription plan created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create subscription plan');
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...formData }: { id: string } & SubscriptionPlanFormData) => {
      const { data, error } = await (supabase as any)
        .from('subscription_plans')
        .update({
          ...formData,
          features: formData.features || [],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SubscriptionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Subscription plan updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subscription plan');
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await (supabase as any)
        .from('subscription_plans')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Subscription plan deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete subscription plan');
    },
  });

  const updateAllPlansCurrency = useMutation({
    mutationFn: async (currency: string) => {
      const { error } = await (supabase as any)
        .from('subscription_plans')
        .update({ currency })
        .eq('is_active', true);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success('Currency updated for all plans');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update currency');
    },
  });

  return {
    plans,
    isLoading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
    updateAllPlansCurrency,
  };
}

