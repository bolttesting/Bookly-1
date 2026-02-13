import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Review {
  id: string;
  name: string;
  role: string | null;
  content: string;
  rating: number;
  display_order: number;
  created_at: string;
}

export function useReviews() {
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['reviews'],
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('reviews')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (rows ?? []) as Review[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Review, 'id' | 'created_at'>) => {
      const { data: created, error } = await supabase
        .from('reviews')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return created as Review;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Review> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as Review;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
  });

  return {
    reviews: data,
    isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
