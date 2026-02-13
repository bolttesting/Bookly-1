import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export function useBlogPosts(adminView = false) {
  const queryClient = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ['blogPosts', adminView],
    queryFn: async () => {
      let q = supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
      if (!adminView) {
        q = q.eq('published', true);
      }
      const { data: rows, error } = await q;
      if (error) throw error;
      return (rows ?? []) as BlogPost[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: created, error } = await supabase
        .from('blog_posts')
        .insert({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return created as BlogPost;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blogPosts'] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Omit<BlogPost, 'id' | 'created_at'>> & { id: string }) => {
      const { data: updated, error } = await supabase
        .from('blog_posts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as BlogPost;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blogPosts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blogPosts'] }),
  });

  return {
    posts: data,
    isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
