import { useBusiness } from './useBusiness';

type AppRole = 'owner' | 'admin' | 'staff';

export function useDashboardRole() {
  const { business, role: roleFromBusiness, loading: businessLoading } = useBusiness();

  // Role comes from useBusiness (same user_roles fetch) - no extra round trip
  const currentUserRole = roleFromBusiness ?? null;
  const isLoading = businessLoading;

  return {
    role: currentUserRole,
    isOwner: currentUserRole === 'owner',
    isAdmin: currentUserRole === 'admin' || currentUserRole === 'owner',
    isStaff: currentUserRole === 'staff',
    canAccessAdmin: currentUserRole === 'admin' || currentUserRole === 'owner',
    isLoading,
  };
}
