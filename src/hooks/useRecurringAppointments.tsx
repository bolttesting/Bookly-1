import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface RecurringAppointmentSeries {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  location_id: string | null;
  recurrence_pattern: 'weekly' | 'monthly';
  recurrence_frequency: number;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  max_occurrences: number | null;
  time_of_day: string; // HH:MM
  status: 'active' | 'paused' | 'cancelled';
  notes: string | null;
  price: number | null;
  total_created: number;
  last_generated_date: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  // Joined data
  customer?: { id: string; name: string; email: string | null };
  service?: { id: string; name: string; duration: number; price: number };
  staff_member?: { id: string; name: string } | null;
}

export interface RecurringSeriesFormData {
  customer_id: string;
  service_id: string;
  staff_id?: string | null;
  location_id?: string | null;
  recurrence_pattern: 'weekly' | 'monthly';
  recurrence_frequency: number;
  start_date: Date;
  end_date?: Date | null;
  max_occurrences?: number | null;
  time_of_day: string; // HH:MM format
  notes?: string;
  price?: number | null;
  generate_initial_appointments?: boolean; // Generate appointments immediately
}

export function useRecurringAppointments() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: series = [], isLoading, error } = useQuery({
    queryKey: ['recurring-appointments', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('recurring_appointment_series')
        .select(`
          *,
          customer:customers(id, name, email),
          service:services(id, name, duration, price),
          staff_member:staff_members(id, name)
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RecurringAppointmentSeries[];
    },
    enabled: !!business?.id,
  });

  const createSeries = useMutation({
    mutationFn: async (formData: RecurringSeriesFormData) => {
      if (!business?.id) throw new Error('No business found');

      const { data: newSeries, error } = await supabase
        .from('recurring_appointment_series')
        .insert({
          business_id: business.id,
          customer_id: formData.customer_id,
          service_id: formData.service_id,
          staff_id: formData.staff_id || null,
          location_id: formData.location_id || null,
          recurrence_pattern: formData.recurrence_pattern,
          recurrence_frequency: formData.recurrence_frequency,
          start_date: format(formData.start_date, 'yyyy-MM-dd'),
          end_date: formData.end_date ? format(formData.end_date, 'yyyy-MM-dd') : null,
          max_occurrences: formData.max_occurrences || null,
          time_of_day: formData.time_of_day,
          notes: formData.notes || null,
          price: formData.price || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      // Generate initial appointments if requested
      if (formData.generate_initial_appointments) {
        const { error: generateError } = await supabase.rpc('generate_recurring_appointments', {
          series_id: newSeries.id,
          generate_until_date: formData.end_date 
            ? format(formData.end_date, 'yyyy-MM-dd')
            : format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 3 months ahead
        });

        if (generateError) {
          console.error('Error generating initial appointments:', generateError);
          // Don't fail the entire operation, just log the error
          toast.warning('Series created but some appointments could not be generated. Please check availability.');
        }
      }

      return newSeries as RecurringAppointmentSeries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-appointments', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success('Recurring appointment series created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create recurring series');
    },
  });

  const updateSeries = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringSeriesFormData> & { id: string }) => {
      const updateData: any = {};

      if (updates.recurrence_pattern !== undefined) updateData.recurrence_pattern = updates.recurrence_pattern;
      if (updates.recurrence_frequency !== undefined) updateData.recurrence_frequency = updates.recurrence_frequency;
      if (updates.start_date !== undefined) updateData.start_date = format(updates.start_date, 'yyyy-MM-dd');
      if (updates.end_date !== undefined) {
        updateData.end_date = updates.end_date ? format(updates.end_date, 'yyyy-MM-dd') : null;
      }
      if (updates.max_occurrences !== undefined) updateData.max_occurrences = updates.max_occurrences || null;
      if (updates.time_of_day !== undefined) updateData.time_of_day = updates.time_of_day;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;
      if (updates.price !== undefined) updateData.price = updates.price || null;
      if (updates.staff_id !== undefined) updateData.staff_id = updates.staff_id || null;

      const { data, error } = await supabase
        .from('recurring_appointment_series')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringAppointmentSeries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-appointments', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success('Recurring series updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update recurring series');
    },
  });

  const pauseSeries = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('recurring_appointment_series')
        .update({ status: 'paused' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringAppointmentSeries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-appointments', business?.id] });
      toast.success('Recurring series paused');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to pause series');
    },
  });

  const resumeSeries = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('recurring_appointment_series')
        .update({ status: 'active' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringAppointmentSeries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-appointments', business?.id] });
      toast.success('Recurring series resumed');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to resume series');
    },
  });

  const cancelSeries = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('recurring_appointment_series')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as RecurringAppointmentSeries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-appointments', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success('Recurring series cancelled');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel series');
    },
  });

  const generateAppointments = useMutation({
    mutationFn: async ({ seriesId, untilDate }: { seriesId: string; untilDate?: Date }) => {
      const { data, error } = await supabase.rpc('generate_recurring_appointments', {
        series_id: seriesId,
        generate_until_date: untilDate ? format(untilDate, 'yyyy-MM-dd') : null,
      });

      if (error) throw error;
      return data as number; // Returns count of generated appointments
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-appointments', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success(`Generated ${count} new appointment${count !== 1 ? 's' : ''}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to generate appointments');
    },
  });

  // Get appointments for a specific series
  const getSeriesAppointments = async (seriesId: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customers(id, name, email),
        service:services(id, name, duration, price),
        staff_member:staff_members(id, name)
      `)
      .eq('recurring_series_id', seriesId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  };

  return {
    series,
    isLoading,
    error,
    createSeries,
    updateSeries,
    pauseSeries,
    resumeSeries,
    cancelSeries,
    generateAppointments,
    getSeriesAppointments,
  };
}

