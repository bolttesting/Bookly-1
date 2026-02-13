import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  id: string;
  footer_copyright: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  updated_at: string;
}

export function useSiteSettings() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('site_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return row as SiteSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<SiteSettings, 'footer_copyright' | 'contact_email' | 'contact_phone' | 'contact_address'>>) => {
      if (!data?.id) throw new Error('No site settings found');
      const { data: updated, error } = await supabase
        .from('site_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return updated as SiteSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
    },
  });

  return {
    settings: data ?? null,
    isLoading,
    update: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
