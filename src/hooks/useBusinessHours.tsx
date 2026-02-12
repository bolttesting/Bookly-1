import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface BusinessHours {
  id: string;
  business_id: string;
  location_id: string | null;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHoursFormData {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_HOURS: Omit<BusinessHoursFormData, 'day_of_week'>[] = Array(7).fill({
  open_time: '09:00',
  close_time: '18:00',
  is_closed: false,
});

export function useBusinessHours(businessId?: string, locationId?: string | null) {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const targetBusinessId = businessId || business?.id;

  const { data: hours = [], isLoading, error } = useQuery({
    queryKey: ['business-hours', targetBusinessId, locationId],
    staleTime: 0,
    queryFn: async () => {
      if (!targetBusinessId) return [];

      let query = supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', targetBusinessId)
        .order('day_of_week');

      // If locationId is provided, fetch location-specific hours
      // If locationId is null/undefined, fetch default business hours (no location)
      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.is('location_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BusinessHours[];
    },
    enabled: !!targetBusinessId,
  });

  // Get hours organized by day - always return all 7 days with defaults
  const hoursByDay = DAY_NAMES.map((name, index) => {
    const dayHours = hours.find(h => h.day_of_week === index);
    return {
      day: index,
      name,
      open_time: dayHours?.open_time?.slice(0, 5) || '09:00',
      close_time: dayHours?.close_time?.slice(0, 5) || '18:00',
      is_closed: dayHours?.is_closed ?? (index === 0), // Sunday closed by default
      id: dayHours?.id,
    };
  });

  const saveHours = useMutation({
    mutationFn: async (hoursData: BusinessHoursFormData[]) => {
      if (!targetBusinessId) throw new Error('No business found');

      // Use RPC to reliably save (handles NULL location_id and RLS edge cases)
      const { error } = await supabase.rpc('save_business_hours', {
        p_business_id: targetBusinessId,
        p_location_id: locationId || null,
        p_hours: hoursData.map(h => ({
          day_of_week: h.day_of_week,
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: h.is_closed,
        })),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours', targetBusinessId, locationId] });
      toast.success('Business hours saved');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save hours');
    },
  });

  return {
    hours,
    hoursByDay,
    isLoading,
    error,
    saveHours,
    DAY_NAMES,
  };
}
