import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface ScheduledClassRow {
  id: string;
  business_id: string;
  location_id: string;
  facility_id: string | null;
  day_of_week: number;
  start_time: string;
  service_id: string;
  staff_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  service?: { id: string; name: string; duration: number };
  staff?: { id: string; name: string } | null;
  facility?: { id: string; name: string } | null;
  location?: { id: string; name: string };
}

export interface ScheduledClassInsert {
  location_id: string;
  facility_id?: string | null;
  day_of_week: number;
  start_time: string;
  service_id: string;
  staff_id?: string | null;
  display_order?: number;
}

export function useScheduledClasses(businessId: string | null) {
  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['scheduled-classes', businessId],
    queryFn: async (): Promise<ScheduledClassRow[]> => {
      if (!businessId) return [];
      try {
        const { data, error } = await supabase
          .from('scheduled_classes')
          .select(`
            id, business_id, location_id, facility_id, day_of_week, start_time, service_id, staff_id, display_order, created_at, updated_at,
            service:services(id, name, duration),
            staff:staff_members(id, name),
            facility:facilities(id, name),
            location:business_locations(id, name)
          `)
          .eq('business_id', businessId)
          .order('location_id')
          .order('day_of_week')
          .order('start_time');
        if (error) throw error;
        return (data ?? []) as ScheduledClassRow[];
      } catch {
        return [];
      }
    },
    enabled: !!businessId,
  });

  const create = useMutation({
    mutationFn: async (payload: ScheduledClassInsert) => {
      if (!businessId) throw new Error('No business');
      const t = payload.start_time.trim();
      const startTime = /^\d{1,2}:\d{2}$/.test(t) ? `${t}:00` : t;
      const { data, error } = await supabase
        .from('scheduled_classes')
        .insert({
          business_id: businessId,
          location_id: payload.location_id,
          facility_id: payload.facility_id ?? null,
          day_of_week: payload.day_of_week,
          start_time: startTime,
          service_id: payload.service_id,
          staff_id: payload.staff_id ?? null,
          display_order: payload.display_order ?? 0,
        })
        .select()
        .single();
      if (error) {
        const msg = error.message + (error.details ? ` (${error.details})` : '') + (error.hint ? ` — ${error.hint}` : '');
        throw new Error(msg);
      }
      return data as ScheduledClassRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-classes', businessId] });
      toast.success('Class added to schedule');
    },
    onError: (e: Error) => {
      toast.error(e.message || 'Failed to add class');
      console.error('[scheduled_classes insert]', e.message, e);
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      facility_id,
      start_time,
      service_id,
      staff_id,
      display_order,
    }: {
      id: string;
      facility_id?: string | null;
      start_time?: string;
      service_id?: string;
      staff_id?: string | null;
      display_order?: number;
    }) => {
      const updates: Record<string, unknown> = {};
      if (facility_id !== undefined) updates.facility_id = facility_id;
      if (start_time !== undefined) updates.start_time = start_time;
      if (service_id !== undefined) updates.service_id = service_id;
      if (staff_id !== undefined) updates.staff_id = staff_id;
      if (display_order !== undefined) updates.display_order = display_order;
      const { data, error } = await supabase
        .from('scheduled_classes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ScheduledClassRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-classes', businessId] });
      toast.success('Schedule updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('scheduled_classes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-classes', businessId] });
      toast.success('Class removed from schedule');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove'),
  });

  return { rows, isLoading, create, update, remove, dayNames: DAY_NAMES };
}
