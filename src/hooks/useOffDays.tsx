import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';
import { format } from 'date-fns';

export interface OffDay {
  id: string;
  business_id: string;
  location_id: string | null;
  off_date: string; // YYYY-MM-DD format
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OffDayFormData {
  off_date: Date;
  reason?: string;
  location_id?: string | null;
}

export function useOffDays(locationId?: string | null) {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: offDays = [], isLoading, error } = useQuery({
    queryKey: ['off-days', business?.id, locationId],
    queryFn: async () => {
      if (!business?.id) return [];

      let query = supabase
        .from('off_days')
        .select('*')
        .eq('business_id', business.id)
        .order('off_date', { ascending: true });

      // If locationId is provided, fetch location-specific off days
      // If locationId is null/undefined, fetch default business off days (no location)
      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.is('location_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OffDay[];
    },
    enabled: !!business?.id,
  });

  const createOffDay = useMutation({
    mutationFn: async (data: OffDayFormData) => {
      if (!business?.id) throw new Error('No business found');

      const offDateStr = format(data.off_date, 'yyyy-MM-dd');

      const { data: newOffDay, error } = await supabase
        .from('off_days')
        .insert({
          business_id: business.id,
          location_id: locationId || data.location_id || null,
          off_date: offDateStr,
          reason: data.reason || null,
        })
        .select()
        .single();

      if (error) throw error;
      return newOffDay as OffDay;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['off-days', business?.id, locationId] });
      toast.success('Off day added successfully');
    },
    onError: (error) => {
      if (error instanceof Error && error.message.includes('duplicate')) {
        toast.error('This date is already marked as an off day');
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to add off day');
      }
    },
  });

  const deleteOffDay = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('off_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['off-days', business?.id, locationId] });
      toast.success('Off day removed successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove off day');
    },
  });

  // Check if a specific date is an off day
  const isOffDay = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return offDays.some(offDay => offDay.off_date === dateStr);
  };

  return {
    offDays,
    isLoading,
    error,
    createOffDay,
    deleteOffDay,
    isOffDay,
  };
}

