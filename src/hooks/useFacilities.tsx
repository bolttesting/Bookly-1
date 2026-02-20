import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Facility {
  id: string;
  location_id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useFacilities(locationId: string | null) {
  const queryClient = useQueryClient();

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['facilities', locationId],
    queryFn: async (): Promise<Facility[]> => {
      if (!locationId) return [];
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('location_id', locationId)
        .order('display_order')
        .order('name');
      if (error) throw error;
      return (data ?? []) as Facility[];
    },
    enabled: !!locationId,
  });

  const create = useMutation({
    mutationFn: async (payload: { name: string; display_order?: number }) => {
      if (!locationId) throw new Error('No location selected');
      const { data, error } = await supabase
        .from('facilities')
        .insert({
          location_id: locationId,
          name: payload.name.trim(),
          display_order: payload.display_order ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', locationId] });
      toast.success('Facility added');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to add facility'),
  });

  const update = useMutation({
    mutationFn: async ({ id, name, display_order }: { id: string; name?: string; display_order?: number }) => {
      const updates: Partial<Facility> = {};
      if (name !== undefined) updates.name = name.trim();
      if (display_order !== undefined) updates.display_order = display_order;
      const { data, error } = await supabase
        .from('facilities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Facility;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', locationId] });
      toast.success('Facility updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update facility'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('facilities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facilities', locationId] });
      toast.success('Facility removed');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to remove facility'),
  });

  return { facilities, isLoading, create, update, remove };
}
