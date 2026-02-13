import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FooterLink {
  id: string;
  label: string;
  url: string;
  display_order: number;
  created_at: string;
}

export function useFooterLinks() {
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['footerLinks'],
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('footer_links')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (rows ?? []) as FooterLink[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<FooterLink, 'id' | 'created_at'>) => {
      const { data: created, error } = await supabase
        .from('footer_links')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return created as FooterLink;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['footerLinks'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FooterLink> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('footer_links')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as FooterLink;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['footerLinks'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('footer_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['footerLinks'] }),
  });

  return {
    links: data,
    isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
