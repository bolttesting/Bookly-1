import { useEffect, useState } from 'react';
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

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number | null;
  notes: string | null;
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
}

interface RevenueData {
  name: string;
  revenue: number;
}

export function useDashboard() {
  const { business } = useBusiness();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
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

      // Fetch today's revenue
      const { data: todayAppointments } = await supabase
        .from('appointments')
        .select('price')
        .eq('business_id', business.id)
        .eq('status', 'completed')
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString());

      const todayRevenue = todayAppointments?.reduce((sum, apt) => sum + (apt.price || 0), 0) || 0;

      // Fetch this week's appointments for completion rate and revenue chart
      const { data: weekAppointments } = await supabase
        .from('appointments')
        .select('start_time, status, price')
        .eq('business_id', business.id)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString());

      const completedThisWeek = weekAppointments?.filter(a => a.status === 'completed').length || 0;
      const totalThisWeek = weekAppointments?.length || 0;
      const completionRate = totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 100;

      // Calculate weekly revenue by day
      const revenueByDay: Record<string, number> = {};
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      days.forEach(day => revenueByDay[day] = 0);

      weekAppointments?.forEach(apt => {
        if (apt.status === 'completed' && apt.price) {
          const dayName = format(new Date(apt.start_time), 'EEE');
          if (revenueByDay[dayName] !== undefined) {
            revenueByDay[dayName] += apt.price;
          }
        }
      });

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

      setStats({
        todayBookings: todayCount || 0,
        yesterdayBookings: yesterdayCount || 0,
        totalCustomers: totalCustomers || 0,
        newCustomersThisMonth: newCustomers || 0,
        todayRevenue,
        avgDailyRevenue: 0,
        completionRate,
        lastWeekCompletionRate: 0,
      });

      setRecentAppointments(recent as unknown as Appointment[] || []);
      setUpcomingAppointments(upcoming as unknown as Appointment[] || []);
      setWeeklyRevenue(weeklyRevenueData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id) {
      fetchDashboardData();
    } else {
      // Clear data if business is not available
      setStats(null);
      setRecentAppointments([]);
      setUpcomingAppointments([]);
      setWeeklyRevenue([]);
      setLoading(false);
    }
  }, [business?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    stats,
    recentAppointments,
    upcomingAppointments,
    weeklyRevenue,
    loading,
    refetch: fetchDashboardData,
  };
}