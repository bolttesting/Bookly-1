import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format, subDays, subWeeks, subMonths, subYears } from 'date-fns';

export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

export interface DateRangeFilter {
  type: DateRange;
  startDate?: Date;
  endDate?: Date;
}

export interface RevenueReport {
  totalRevenue: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  averageRevenuePerAppointment: number;
  revenueByDay: Array<{ date: string; revenue: number; appointments: number }>;
  revenueByService: Array<{ serviceName: string; revenue: number; appointments: number }>;
  revenueByStaff: Array<{ staffName: string; revenue: number; appointments: number }>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  newVsReturning: { new: number; returning: number };
  averageLifetimeValue: number;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    totalSpent: number;
    totalVisits: number;
    averageSpent: number;
    lastVisit: string;
  }>;
  customerGrowth: Array<{ date: string; newCustomers: number; totalCustomers: number }>;
}

export interface ServicePerformance {
  totalServices: number;
  mostBookedServices: Array<{
    serviceId: string;
    serviceName: string;
    bookings: number;
    revenue: number;
    averagePrice: number;
  }>;
  revenueByService: Array<{
    serviceId: string;
    serviceName: string;
    revenue: number;
    bookings: number;
    percentage: number;
  }>;
}

export interface StaffPerformance {
  totalStaff: number;
  staffStats: Array<{
    staffId: string;
    staffName: string;
    totalAppointments: number;
    completedAppointments: number;
    revenue: number;
    averageRevenuePerAppointment: number;
    completionRate: number;
  }>;
}

function getDateRange(filter: DateRangeFilter): { start: Date; end: Date } {
  const now = new Date();
  
  switch (filter.type) {
    case 'today':
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return {
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
      };
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };
    case 'custom':
      return {
        start: filter.startDate || startOfDay(now),
        end: filter.endDate || endOfDay(now),
      };
    default:
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
  }
}

export function useAnalytics(filter: DateRangeFilter = { type: 'month' }) {
  const { business } = useBusiness();
  const dateRange = getDateRange(filter);

  // Revenue Report
  const { data: revenueReport, isLoading: revenueLoading } = useQuery({
    queryKey: ['analytics-revenue', business?.id, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<RevenueReport> => {
      if (!business?.id) throw new Error('Business not found');

      // Fetch all appointments in date range (include payment_status for revenue)
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          payment_status,
          price,
          service_id,
          staff_id,
          services:service_id (name),
          staff_members:staff_id (name)
        `)
        .eq('business_id', business.id)
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString());

      if (error) throw error;

      const isPaidOrCompleted = (apt: { status: string; payment_status?: string | null }) =>
        apt.status === 'completed' || apt.payment_status === 'paid' || apt.payment_status === 'partial';

      const completed = appointments?.filter(a => a.status === 'completed') || [];
      const revenueAppointments = appointments?.filter(a => isPaidOrCompleted(a)) || [];
      const cancelled = appointments?.filter(a => a.status === 'cancelled') || [];
      
      const totalRevenue = revenueAppointments.reduce((sum, apt) => sum + (Number(apt.price) || 0), 0);
      const totalAppointments = appointments?.length || 0;
      const completedAppointments = completed.length;
      const cancelledAppointments = cancelled.length;
      const averageRevenuePerAppointment = completedAppointments > 0 
        ? totalRevenue / completedAppointments 
        : 0;

      // Revenue by day (include paid/partial)
      const revenueByDayMap: Record<string, { revenue: number; appointments: number }> = {};
      appointments?.forEach(apt => {
        if (isPaidOrCompleted(apt) && apt.price) {
          const dateKey = format(new Date(apt.start_time), 'yyyy-MM-dd');
          if (!revenueByDayMap[dateKey]) {
            revenueByDayMap[dateKey] = { revenue: 0, appointments: 0 };
          }
          revenueByDayMap[dateKey].revenue += Number(apt.price);
          revenueByDayMap[dateKey].appointments += 1;
        }
      });

      const revenueByDay = Object.entries(revenueByDayMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Revenue by service (include paid/partial)
      const revenueByServiceMap: Record<string, { serviceName: string; revenue: number; appointments: number }> = {};
      revenueAppointments.forEach(apt => {
        const serviceName = (apt.services as any)?.name || 'Unknown Service';
        const serviceId = apt.service_id;
        if (!revenueByServiceMap[serviceId]) {
          revenueByServiceMap[serviceId] = { serviceName, revenue: 0, appointments: 0 };
        }
        revenueByServiceMap[serviceId].revenue += Number(apt.price) || 0;
        revenueByServiceMap[serviceId].appointments += 1;
      });

      const revenueByService = Object.values(revenueByServiceMap)
        .sort((a, b) => b.revenue - a.revenue);

      // Revenue by staff (include paid/partial)
      const revenueByStaffMap: Record<string, { staffName: string; revenue: number; appointments: number }> = {};
      revenueAppointments.forEach(apt => {
        if (apt.staff_id) {
          const staffName = (apt.staff_members as any)?.name || 'Unassigned';
          const staffId = apt.staff_id;
          if (!revenueByStaffMap[staffId]) {
            revenueByStaffMap[staffId] = { staffName, revenue: 0, appointments: 0 };
          }
          revenueByStaffMap[staffId].revenue += Number(apt.price) || 0;
          revenueByStaffMap[staffId].appointments += 1;
        }
      });

      const revenueByStaff = Object.values(revenueByStaffMap)
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalRevenue,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        averageRevenuePerAppointment,
        revenueByDay,
        revenueByService,
        revenueByStaff,
      };
    },
    enabled: !!business?.id,
  });

  // Customer Analytics
  const { data: customerAnalytics, isLoading: customerLoading } = useQuery({
    queryKey: ['analytics-customers', business?.id, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<CustomerAnalytics> => {
      if (!business?.id) throw new Error('Business not found');

      // Get all customers
      const { data: allCustomers, error: customersError } = await supabase
        .from('customers')
        .select('id, name, created_at, total_spent, total_visits')
        .eq('business_id', business.id);

      if (customersError) throw customersError;

      // Get customers created in date range
      const newCustomers = allCustomers?.filter(c => {
        const created = new Date(c.created_at);
        return created >= dateRange.start && created <= dateRange.end;
      }) || [];

      // Get appointments in date range to identify returning customers
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('customer_id, start_time')
        .eq('business_id', business.id)
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString())
        .eq('status', 'completed');

      if (appointmentsError) throw appointmentsError;

      // Identify returning customers (customers with appointments who existed before date range)
      const customerIdsInRange = new Set(appointments?.map(a => a.customer_id) || []);
      const returningCustomers = allCustomers?.filter(c => {
        const created = new Date(c.created_at);
        return customerIdsInRange.has(c.id) && created < dateRange.start;
      }) || [];

      // Calculate lifetime value (average total spent)
      const totalSpent = allCustomers?.reduce((sum, c) => sum + (Number(c.total_spent) || 0), 0) || 0;
      const averageLifetimeValue = allCustomers && allCustomers.length > 0 
        ? totalSpent / allCustomers.length 
        : 0;

      // Top customers by total spent
      const topCustomers = allCustomers
        ?.map(c => ({
          customerId: c.id,
          customerName: c.name,
          totalSpent: Number(c.total_spent) || 0,
          totalVisits: c.total_visits || 0,
          averageSpent: c.total_visits > 0 ? (Number(c.total_spent) || 0) / c.total_visits : 0,
          lastVisit: '', // Will be filled from appointments
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10) || [];

      // Get last visit dates
      const { data: lastVisits } = await supabase
        .from('appointments')
        .select('customer_id, start_time')
        .eq('business_id', business.id)
        .eq('status', 'completed')
        .order('start_time', { ascending: false });

      const lastVisitMap = new Map<string, string>();
      lastVisits?.forEach(apt => {
        if (!lastVisitMap.has(apt.customer_id)) {
          lastVisitMap.set(apt.customer_id, apt.start_time);
        }
      });

      topCustomers.forEach(customer => {
        customer.lastVisit = lastVisitMap.get(customer.customerId) || '';
      });

      // Customer growth over time
      const customerGrowthMap: Record<string, { newCustomers: number; totalCustomers: number }> = {};
      allCustomers?.forEach(c => {
        const dateKey = format(new Date(c.created_at), 'yyyy-MM-dd');
        if (!customerGrowthMap[dateKey]) {
          customerGrowthMap[dateKey] = { newCustomers: 0, totalCustomers: 0 };
        }
        customerGrowthMap[dateKey].newCustomers += 1;
      });

      // Calculate cumulative totals
      let cumulativeTotal = 0;
      const customerGrowth = Object.entries(customerGrowthMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => {
          cumulativeTotal += data.newCustomers;
          return {
            date,
            newCustomers: data.newCustomers,
            totalCustomers: cumulativeTotal,
          };
        })
        .filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });

      return {
        totalCustomers: allCustomers?.length || 0,
        newCustomers: newCustomers.length,
        returningCustomers: returningCustomers.length,
        newVsReturning: {
          new: newCustomers.length,
          returning: returningCustomers.length,
        },
        averageLifetimeValue,
        topCustomers,
        customerGrowth,
      };
    },
    enabled: !!business?.id,
  });

  // Service Performance
  const { data: servicePerformance, isLoading: serviceLoading } = useQuery({
    queryKey: ['analytics-services', business?.id, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<ServicePerformance> => {
      if (!business?.id) throw new Error('Business not found');

      // Get all services
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, name, price')
        .eq('business_id', business.id);

      if (servicesError) throw servicesError;

      // Get appointments in date range (include payment_status for revenue)
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('service_id, price, status, payment_status, services:service_id (name)')
        .eq('business_id', business.id)
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString());

      if (appointmentsError) throw appointmentsError;

      const isPaidOrCompleted = (apt: { status: string; payment_status?: string | null }) =>
        apt.status === 'completed' || apt.payment_status === 'paid' || apt.payment_status === 'partial';

      // Calculate service stats
      const serviceStatsMap: Record<string, {
        serviceId: string;
        serviceName: string;
        bookings: number;
        revenue: number;
        totalPrice: number;
      }> = {};

      appointments?.forEach((apt: any) => {
        const serviceId = apt.service_id;
        const serviceName = (apt.services as any)?.name || 'Unknown';
        const price = Number(apt.price) || 0;

        if (!serviceStatsMap[serviceId]) {
          serviceStatsMap[serviceId] = {
            serviceId,
            serviceName,
            bookings: 0,
            revenue: 0,
            totalPrice: 0,
          };
        }

        serviceStatsMap[serviceId].bookings += 1;
        if (isPaidOrCompleted(apt)) {
          serviceStatsMap[serviceId].revenue += price;
        }
        serviceStatsMap[serviceId].totalPrice += price;
      });

      const mostBookedServices = Object.values(serviceStatsMap)
        .map(s => ({
          ...s,
          averagePrice: s.bookings > 0 ? s.totalPrice / s.bookings : 0,
        }))
        .sort((a, b) => b.bookings - a.bookings);

      const totalRevenue = Object.values(serviceStatsMap).reduce((sum, s) => sum + s.revenue, 0);

      const revenueByService = Object.values(serviceStatsMap)
        .map(s => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          revenue: s.revenue,
          bookings: s.bookings,
          percentage: totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalServices: services?.length || 0,
        mostBookedServices: mostBookedServices.slice(0, 10),
        revenueByService,
      };
    },
    enabled: !!business?.id,
  });

  // Staff Performance
  const { data: staffPerformance, isLoading: staffLoading } = useQuery({
    queryKey: ['analytics-staff', business?.id, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async (): Promise<StaffPerformance> => {
      if (!business?.id) throw new Error('Business not found');

      // Get all staff
      const { data: staff, error: staffError } = await supabase
        .from('staff_members')
        .select('id, name')
        .eq('business_id', business.id);

      if (staffError) throw staffError;

      // Get appointments in date range (include payment_status for revenue)
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('staff_id, price, status, payment_status, staff_members:staff_id (name)')
        .eq('business_id', business.id)
        .gte('start_time', dateRange.start.toISOString())
        .lte('start_time', dateRange.end.toISOString());

      if (appointmentsError) throw appointmentsError;

      // Calculate staff stats
      const staffStatsMap: Record<string, {
        staffId: string;
        staffName: string;
        totalAppointments: number;
        completedAppointments: number;
        revenue: number;
      }> = {};

      const isPaidOrCompletedStaff = (apt: { status: string; payment_status?: string | null }) =>
        apt.status === 'completed' || apt.payment_status === 'paid' || apt.payment_status === 'partial';

      appointments?.forEach(apt => {
        if (apt.staff_id) {
          const staffId = apt.staff_id;
          const staffName = (apt.staff_members as any)?.name || 'Unassigned';

          if (!staffStatsMap[staffId]) {
            staffStatsMap[staffId] = {
              staffId,
              staffName,
              totalAppointments: 0,
              completedAppointments: 0,
              revenue: 0,
            };
          }

          staffStatsMap[staffId].totalAppointments += 1;
          if (apt.status === 'completed') {
            staffStatsMap[staffId].completedAppointments += 1;
          }
          if (isPaidOrCompletedStaff(apt)) {
            staffStatsMap[staffId].revenue += Number(apt.price) || 0;
          }
        }
      });

      const staffStats = Object.values(staffStatsMap).map(s => ({
        ...s,
        averageRevenuePerAppointment: s.completedAppointments > 0 
          ? s.revenue / s.completedAppointments 
          : 0,
        completionRate: s.totalAppointments > 0 
          ? (s.completedAppointments / s.totalAppointments) * 100 
          : 0,
      })).sort((a, b) => b.revenue - a.revenue);

      return {
        totalStaff: staff?.length || 0,
        staffStats,
      };
    },
    enabled: !!business?.id,
  });

  return {
    revenueReport,
    customerAnalytics,
    servicePerformance,
    staffPerformance,
    loading: revenueLoading || customerLoading || serviceLoading || staffLoading,
    dateRange,
  };
}

