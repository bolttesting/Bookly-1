import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';

type AppRole = 'owner' | 'admin' | 'staff';

export function useDashboardRole() {
  const { business } = useBusiness();

  const { data: currentUserRole, isLoading } = useQuery({
    queryKey: ['dashboardRole', business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('business_id', business.id)
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data?.role as AppRole;
    },
    enabled: !!business?.id,
  });

  return {
    role: currentUserRole ?? null,
    isOwner: currentUserRole === 'owner',
    isAdmin: currentUserRole === 'admin' || currentUserRole === 'owner',
    isStaff: currentUserRole === 'staff',
    canAccessAdmin: currentUserRole === 'admin' || currentUserRole === 'owner',
    isLoading,
  };
}
