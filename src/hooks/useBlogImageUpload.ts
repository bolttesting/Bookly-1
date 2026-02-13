import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;

export function useBlogImageUpload() {
  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type: ${file.name}. Use JPG, PNG, GIF, or WebP.`);
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`File too large: ${file.name}. Max ${MAX_SIZE_MB}MB.`);
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `blog/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      return `${publicUrl}?t=${Date.now()}`;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    uploadImage: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
