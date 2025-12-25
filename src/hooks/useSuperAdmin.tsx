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

  const { data: isSuperAdmin, isLoading: checkingAdmin } = useQuery({
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
  });

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
        .from('packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Package[];
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
