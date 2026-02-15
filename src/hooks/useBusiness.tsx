import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Business {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  timezone: string | null;
  logo_url: string | null;
  currency: string | null;
  subscription_plan_id: string | null;
  stripe_account_id: string | null;
  stripe_connected: boolean | null;
  stripe_onboarding_complete: boolean | null;
  require_payment?: boolean | null;
  payment_timing?: 'advance' | 'on_spot' | 'partial' | null;
  payment_due_before_hours?: number | null;
  allow_partial_payment?: boolean | null;
  partial_payment_percentage?: number | null;
  reschedule_deadline_hours?: number | null;
  booking_theme?: 'light' | 'dark' | 'system' | null;
}

type AppRole = 'owner' | 'admin' | 'staff';

async function fetchBusinessAndRole(userId: string): Promise<{ business: Business | null; role: AppRole | null }> {
  try {
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('business_id, role')
      .eq('user_id', userId)
      .maybeSingle();
    if (roleError) {
      console.warn('[useBusiness] user_roles fetch failed:', roleError.message);
      return { business: null, role: null };
    }
    if (!roleData?.business_id) return { business: null, role: null };

    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', roleData.business_id)
      .single();
    if (businessError) {
      console.warn('[useBusiness] businesses fetch failed:', businessError.message);
      return { business: null, role: null };
    }
    return { business: businessData, role: (roleData.role as AppRole) ?? null };
  } catch (e) {
    console.warn('[useBusiness] unexpected error:', e);
    return { business: null, role: null };
  }
}

export function useBusiness() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['business', user?.id],
    queryFn: () => fetchBusinessAndRole(user!.id),
    enabled: !!user?.id && !authLoading,
    staleTime: 30_000, // Cache 30s - one fetch shared by all components
  });

  const business = data?.business ?? null;
  const role = data?.role ?? null;

  const createBusiness = async (businessData: {
    name: string;
    industry?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    currency?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    // Create slug from business name
    const slug = businessData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Get the default free plan (Starter)
    const { data: defaultPlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Starter')
      .eq('price', 0)
      .eq('is_active', true)
      .maybeSingle();

    // Insert the business
    const { data: newBusiness, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessData.name,
        slug: `${slug}-${Date.now()}`,
        industry: businessData.industry || null,
        phone: businessData.phone || null,
        email: businessData.email || null,
        address: businessData.address || null,
        city: businessData.city || null,
        currency: businessData.currency || 'USD',
        subscription_plan_id: defaultPlan?.id || null,
      })
      .select()
      .single();

    if (businessError) throw businessError;

    // Create the user role (owner)
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        business_id: newBusiness.id,
        role: 'owner',
      });

    if (roleError) throw roleError;

    queryClient.setQueryData(['business', user.id], { business: newBusiness, role: 'owner' });
    return newBusiness;
  };

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!business || !user) throw new Error('Business or user not found');

    const { data: updatedBusiness, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', business.id)
      .select()
      .single();

    if (error) throw error;

    queryClient.setQueryData(['business', user.id], (prev: { business: Business; role: AppRole } | undefined) =>
      prev ? { ...prev, business: updatedBusiness } : { business: updatedBusiness, role: role ?? 'owner' }
    );
    return updatedBusiness;
  };

  return {
    business,
    role,
    loading: authLoading || isLoading,
    error: error as Error | null,
    createBusiness,
    updateBusiness,
    refetch,
  };
}
