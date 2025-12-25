import { Navigate, Outlet } from 'react-router-dom';
import { useBusiness } from '@/hooks/useBusiness';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function RequiresBusiness() {
  const { business, loading } = useBusiness();
  const hasHadBusinessRef = useRef(false);

  // Track if we've ever successfully loaded a business
  useEffect(() => {
    if (business?.id) {
      hasHadBusinessRef.current = true;
    }
  }, [business?.id]);

  // Show loading while business is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we have a business, render the outlet
  if (business) {
    return <Outlet />;
  }

  // If we've had a business before but it's now null, show loading instead of redirecting
  // This prevents redirect on temporary null states during refetches
  if (hasHadBusinessRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect if we've never had a business and loading is complete
  return <Navigate to="/onboarding" replace />;
}
