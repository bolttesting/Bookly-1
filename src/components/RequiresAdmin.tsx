import { Navigate, Outlet } from 'react-router-dom';
import { useDashboardRole } from '@/hooks/useDashboardRole';
import { Loader2 } from 'lucide-react';

/**
 * Wraps routes that only owners and admins can access.
 * Staff are redirected to the dashboard.
 */
export default function RequiresAdmin() {
  const { canAccessAdmin, isLoading } = useDashboardRole();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccessAdmin) {
    return <Navigate to="/dashboard" replace state={{ message: 'Only owners and admins can access this section.' }} />;
  }

  return <Outlet />;
}
