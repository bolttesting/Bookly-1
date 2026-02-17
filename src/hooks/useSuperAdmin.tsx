import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Business {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
}

interface Package {
  id: string;
  name: string;
  price: number;
  total_credits: number;
  used_credits: number;
  status: string;
  expires_at: string | null;
  created_at: string;
  customer_id: string;
  business_id: string;
  currency?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_spent: number;
  total_visits: number;
  status: string;
  business_id: string;
}

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number | null;
  business_id: string;
  customer_id: string;
  service_id: string;
}

export function useSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin, isLoading: queryLoading } = useQuery({
    queryKey: ['isSuperAdmin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 60_000, // 1 min - avoid refetch on refresh
  });

  // Stay in "checking" until we have a definitive answer (prevents redirect flash on refresh)
  const checkingAdmin = !!user && (queryLoading || isSuperAdmin === undefined);

  const { data: allBusinesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: ['superadmin-businesses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Business[];
    },
    enabled: !!isSuperAdmin,
  });

  const { data: allPackages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['superadmin-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_packages')
        .select(`
          id,
          customer_id,
          business_id,
          purchased_at,
          expires_at,
          bookings_used,
          bookings_remaining,
          status,
          created_at,
          package_templates (name, price, booking_limit),
          businesses (currency)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data ?? []) as any[];
      return rows.map((row) => {
        const template = row.package_templates;
        const totalCredits = (row.bookings_remaining ?? 0) + (row.bookings_used ?? 0);
        return {
          id: row.id,
          name: template?.name ?? 'Package',
          price: template?.price ?? 0,
          total_credits: totalCredits || template?.booking_limit ?? 0,
          used_credits: row.bookings_used ?? 0,
          status: row.status ?? 'active',
          expires_at: row.expires_at ?? null,
          created_at: row.purchased_at ?? row.created_at,
          customer_id: row.customer_id,
          business_id: row.business_id,
          currency: row.businesses?.currency ?? 'USD',
        } as Package;
      });
    },
    enabled: !!isSuperAdmin,
  });

  const { data: allCustomers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ['superadmin-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!isSuperAdmin,
  });

  const { data: allAppointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ['superadmin-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!isSuperAdmin,
  });

  // Calculate stats
  const stats = {
    totalBusinesses: allBusinesses.length,
    totalPackages: allPackages.length,
    activePackages: allPackages.filter(p => p.status === 'active').length,
    totalRevenue: allPackages.reduce((sum, p) => sum + Number(p.price), 0),
    totalCustomers: allCustomers.length,
    totalAppointments: allAppointments.length,
  };

  return {
    isSuperAdmin: !!isSuperAdmin,
    checkingAdmin,
    allBusinesses,
    allPackages,
    allCustomers,
    allAppointments,
    stats,
    loading: loadingBusinesses || loadingPackages || loadingCustomers || loadingAppointments,
  };
}
