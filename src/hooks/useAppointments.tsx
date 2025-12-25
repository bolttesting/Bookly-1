import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: { id: string; name: string; email: string | null; phone: string | null };
  service?: { id: string; name: string; duration: number; price: number };
  staff_member?: { id: string; name: string } | null;
}

export interface AppointmentFormData {
  customer_id: string;
  service_id: string;
  staff_id?: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  price?: number;
}

export function useAppointments(dateRange?: { start: Date; end: Date }) {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', business?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!business?.id) return [];
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, name, email, phone),
          service:services(id, name, duration, price),
          staff_member:staff_members(id, name)
        `)
        .eq('business_id', business.id)
        .order('start_time', { ascending: true });

      if (dateRange?.start && dateRange?.end) {
        query = query
          .gte('start_time', dateRange.start.toISOString())
          .lte('start_time', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!business?.id,
  });

  const createAppointment = useMutation({
    mutationFn: async (appointmentData: AppointmentFormData) => {
      if (!business?.id) throw new Error('No business found');

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          business_id: business.id,
          customer_id: appointmentData.customer_id,
          service_id: appointmentData.service_id,
          staff_id: appointmentData.staff_id || null,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          status: appointmentData.status,
          notes: appointmentData.notes || null,
          price: appointmentData.price || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success('Appointment booked successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to book appointment');
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...appointmentData }: AppointmentFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          customer_id: appointmentData.customer_id,
          service_id: appointmentData.service_id,
          staff_id: appointmentData.staff_id || null,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          status: appointmentData.status,
          notes: appointmentData.notes || null,
          price: appointmentData.price || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success('Appointment updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update appointment');
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success('Appointment cancelled');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
    },
  });

  return {
    appointments,
    isLoading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
}
