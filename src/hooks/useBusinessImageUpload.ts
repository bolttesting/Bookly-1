import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 5;

export function useBusinessImageUpload() {
  const { business } = useBusiness();

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]): Promise<string[]> => {
      if (!business?.id) throw new Error('No business found');

      const urls: string[] = [];
      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`Invalid file type: ${file.name}. Use JPG, PNG, GIF, or WebP.`);
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          throw new Error(`File too large: ${file.name}. Max ${MAX_SIZE_MB}MB.`);
        }

        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${business.id}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from('business-images')
          .upload(fileName, file, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('business-images')
          .getPublicUrl(fileName);

        urls.push(`${publicUrl}?t=${Date.now()}`);
      }
      return urls;
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    uploadImages: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
  };
}
