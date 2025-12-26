import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface BusinessHourRange {
  id: string;
  business_hours_id: string;
  start_time: string;
  end_time: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessHourRangeFormData {
  start_time: string;
  end_time: string;
  display_order?: number;
}

export function useBusinessHourRanges(businessHoursId: string | null | undefined) {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: ranges = [], isLoading, error } = useQuery({
    queryKey: ['business-hour-ranges', businessHoursId],
    queryFn: async () => {
      if (!businessHoursId) return [];

      const { data, error } = await (supabase
        .from('business_hour_ranges' as any)
        .select('*')
        .eq('business_hours_id', businessHoursId)
        .order('display_order', { ascending: true })
        .order('start_time', { ascending: true }) as any);

      if (error) throw error;
      return (data || []) as BusinessHourRange[];
    },
    enabled: !!businessHoursId,
  });

  const createRange = useMutation({
    mutationFn: async (rangeData: BusinessHourRangeFormData & { business_hours_id: string }) => {
      const { data, error } = await (supabase
        .from('business_hour_ranges' as any)
        .insert({
          business_hours_id: rangeData.business_hours_id,
          start_time: rangeData.start_time,
          end_time: rangeData.end_time,
          display_order: rangeData.display_order || 0,
        } as any)
        .select()
        .single() as any);

      if (error) throw error;
      return (data as unknown) as BusinessHourRange;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hour-ranges', businessHoursId] });
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      toast.success('Time range added');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add time range');
    },
  });

  const updateRange = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BusinessHourRangeFormData> & { id: string }) => {
      const { data, error } = await (supabase
        .from('business_hour_ranges' as any)
        .update({
          start_time: updates.start_time,
          end_time: updates.end_time,
          display_order: updates.display_order,
        } as any)
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return (data as unknown) as BusinessHourRange;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hour-ranges', businessHoursId] });
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      toast.success('Time range updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update time range');
    },
  });

  const deleteRange = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('business_hour_ranges' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hour-ranges', businessHoursId] });
      queryClient.invalidateQueries({ queryKey: ['business-hours'] });
      toast.success('Time range removed');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove time range');
    },
  });

  const reorderRanges = useMutation({
    mutationFn: async (rangeIds: string[]) => {
      const updates = rangeIds.map((id, index) => ({
        id,
        display_order: index,
      }));

      const { error } = await (supabase
        .from('business_hour_ranges' as any)
        .upsert(updates.map(u => ({
          id: u.id,
          display_order: u.display_order,
        })) as any) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hour-ranges', businessHoursId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reorder ranges');
    },
  });

  return {
    ranges,
    isLoading,
    error,
    createRange,
    updateRange,
    deleteRange,
    reorderRanges,
  };
}

