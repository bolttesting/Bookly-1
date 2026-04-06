import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, subDays } from 'date-fns';

interface DashboardStats {
  todayBookings: number;
  yesterdayBookings: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  todayRevenue: number;
  avgDailyRevenue: number;
  completionRate: number;
  lastWeekCompletionRate: number;
}

interface AppointmentPaymentSnapshot {
  amount: number;
  currency?: string | null;
  payment_method?: string | null;
  status?: string | null;
  stripe_charge_id?: string | null;
  stripe_payment_intent_id?: string | null;
}

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number | null;
  notes: string | null;
  location_id?: string | null;
  payment_status?: string | null;
  payment_id?: string | null;
  customer: {
    id: string;
    name: string;
  };
  service: {
    id: string;
    name: string;
  };
  staff: {
    id: string;
    name: string;
  } | null;
  payment?: AppointmentPaymentSnapshot | null;
  location?: { id: string; name: string; address?: string | null; city?: string | null } | null;
}

interface RevenueData {
  name: string;
  revenue: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  weeklyRevenue: RevenueData[];
}

function isPaidOrCompleted(status: string, paymentStatus: string | null): boolean {
  return status === 'completed' || paymentStatus === 'paid' || paymentStatus === 'partial';
}

export function useDashboard() {
  const { business } = useBusiness();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', business?.id],
    queryFn: async (): Promise<DashboardData> => {
      if (!business?.id) {
        return {
          stats: {
            todayBookings: 0,
            yesterdayBookings: 0,
            totalCustomers: 0,
            newCustomersThisMonth: 0,
            todayRevenue: 0,
            avgDailyRevenue: 0,
            completionRate: 0,
            lastWeekCompletionRate: 0,
          },
          recentAppointments: [],
          upcomingAppointments: [],
          weeklyRevenue: [],
        };
      }

      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const yesterday = subDays(today, 1);
      const yesterdayStart = startOfDay(yesterday);
      const yesterdayEnd = endOfDay(yesterday);
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Fetch today's appointments count
      const { count: todayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString());

      // Fetch yesterday's appointments count
      const { count: yesterdayCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('start_time', yesterdayStart.toISOString())
        .lte('start_time', yesterdayEnd.toISOString());

      // Fetch total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id);

      // Fetch new customers this month
      const { count: newCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', business.id)
        .gte('created_at', monthStart.toISOString());

      // Fetch today's appointments with payment_status for revenue (include completed OR paid/partial)
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('price, status, payment_status')
        .eq('business_id', business.id)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString());

      let todayRevenue = (todayAppointments || []).reduce((sum, apt) => {
        if (isPaidOrCompleted(apt.status, apt.payment_status) && apt.price) {
          return sum + Number(apt.price);
        }
        return sum;
      }, 0);

      // Add today's package sales (customer_packages purchased today) - skip if query fails (e.g. RLS/column)
      try {
        const { data: todayPackages } = await supabase
          .from('customer_packages')
          .select('package_templates(price)')
          .eq('business_id', business.id)
          .gte('purchased_at', todayStart.toISOString())
          .lte('purchased_at', todayEnd.toISOString());
        todayRevenue += (todayPackages || []).reduce((sum, cp: any) => {
          const price = cp.package_templates?.price;
          return sum + (price != null ? Number(price) : 0);
        }, 0);
      } catch {
        // ignore - package sales not available
      }

      // Fetch this week's appointments for completion rate and revenue chart
      const { data: weekAppointments } = await supabase
        .from('appointments')
        .select('start_time, status, payment_status, price')
        .eq('business_id', business.id)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString());

      const completedThisWeek = (weekAppointments || []).filter(a => a.status === 'completed').length;
      const totalThisWeek = weekAppointments?.length || 0;
      const completionRate = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 100;

      // Calculate weekly revenue by day (include completed OR paid/partial)
      const revenueByDay: Record<string, number> = {};
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(day => revenueByDay[day] = 0);

      (weekAppointments || []).forEach(apt => {
        if (isPaidOrCompleted(apt.status, apt.payment_status) && apt.price) {
          const dayName = format(new Date(apt.start_time), 'EEE');
          if (revenueByDay[dayName] !== undefined) {
            revenueByDay[dayName] += Number(apt.price);
          }
        }
      });

      // Add weekly package sales by day - skip if query fails
      try {
        const { data: weekPackages } = await supabase
          .from('customer_packages')
          .select('purchased_at, package_templates(price)')
          .eq('business_id', business.id)
          .gte('purchased_at', weekStart.toISOString())
          .lte('purchased_at', weekEnd.toISOString());
        (weekPackages || []).forEach((cp: any) => {
          try {
            const dayName = format(new Date(cp.purchased_at ?? 0), 'EEE');
            const price = cp.package_templates?.price;
            if (revenueByDay[dayName] !== undefined && price != null) {
              revenueByDay[dayName] += Number(price);
            }
          } catch {
            // skip invalid row
          }
        });
      } catch {
        // ignore
      }

      const weeklyRevenueData = days.map(day => ({
        name: day,
        revenue: revenueByDay[day]
      }));

      // Fetch recent appointments with relations
      const { data: recent } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          price,
          notes,
          location_id,
          payment_status,
          payment_id,
          customer:customers(id, name),
          service:services(id, name),
          staff:staff_members(id, name)
        `)
        .eq('business_id', business.id)
        .order('start_time', { ascending: false })
        .limit(5);

      // Fetch upcoming appointments for today
      const { data: upcoming } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          price,
          notes,
          location_id,
          payment_status,
          payment_id,
          customer:customers(id, name),
          service:services(id, name),
          staff:staff_members(id, name)
        `)
        .eq('business_id', business.id)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', todayEnd.toISOString())
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(4);

      const recentRows = (recent || []) as Appointment[];
      const upcomingRows = (upcoming || []) as Appointment[];
      const allDash = [...recentRows, ...upcomingRows];
      const paymentIds = [...new Set(allDash.map((r) => r.payment_id).filter(Boolean))] as string[];
      const locationIds = [...new Set(allDash.map((r) => r.location_id).filter(Boolean))] as string[];

      const [paymentsRes, locationsRes] = await Promise.all([
        paymentIds.length > 0
          ? supabase
              .from('payments')
              .select('id, amount, currency, payment_method, status, stripe_charge_id, stripe_payment_intent_id')
              .in('id', paymentIds)
          : Promise.resolve({ data: [] as AppointmentPaymentSnapshot[] }),
        locationIds.length > 0
          ? supabase.from('business_locations').select('id, name, address, city').in('id', locationIds)
          : Promise.resolve({ data: [] as { id: string; name: string; address?: string | null; city?: string | null }[] }),
      ]);

      const paymentById = Object.fromEntries((paymentsRes.data || []).map((p) => [p.id, p]));
      const locationById = Object.fromEntries((locationsRes.data || []).map((l) => [l.id, l]));

      const attachMeta = (rows: Appointment[]): Appointment[] =>
        rows.map((r) => ({
          ...r,
          payment: r.payment_id ? paymentById[r.payment_id as string] ?? null : null,
          location: r.location_id ? locationById[r.location_id as string] ?? null : null,
        }));

      return {
        stats: {
          todayBookings: todayCount || 0,
          yesterdayBookings: yesterdayCount || 0,
          totalCustomers: totalCustomers || 0,
          newCustomersThisMonth: newCustomers || 0,
          todayRevenue,
          avgDailyRevenue: 0,
          completionRate,
          lastWeekCompletionRate: 0,
        },
        recentAppointments: attachMeta(recentRows),
        upcomingAppointments: attachMeta(upcomingRows),
        weeklyRevenue: weeklyRevenueData,
      };
    },
    enabled: !!business?.id,
  });

  return {
    stats: data?.stats ?? null,
    recentAppointments: data?.recentAppointments ?? [],
    upcomingAppointments: data?.upcomingAppointments ?? [],
    weeklyRevenue: data?.weeklyRevenue ?? [],
    loading: isLoading,
    refetch,
  };
}
