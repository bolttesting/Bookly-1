import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface StaffMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string;
  specialties: string[] | null;
  avatar_url: string | null;
  user_id: string | null;
  business_id: string;
  created_at: string;
  updated_at: string;
}

export interface StaffFormData {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  status: string;
  specialties?: string[];
}

export function useStaff() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StaffMember[];
    },
    enabled: !!business?.id,
  });

  const createStaff = useMutation({
    mutationFn: async (staffData: StaffFormData) => {
      if (!business?.id) throw new Error('No business found');

      const { data, error } = await supabase
        .from('staff_members')
        .insert({
          business_id: business.id,
          name: staffData.name,
          email: staffData.email || null,
          phone: staffData.phone || null,
          role: staffData.role || null,
          status: staffData.status,
          specialties: staffData.specialties || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', business?.id] });
      toast.success('Staff member added successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add staff member');
    },
  });

  const updateStaff = useMutation({
    mutationFn: async ({ id, ...staffData }: StaffFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('staff_members')
        .update({
          name: staffData.name,
          email: staffData.email || null,
          phone: staffData.phone || null,
          role: staffData.role || null,
          status: staffData.status,
          specialties: staffData.specialties || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', business?.id] });
      toast.success('Staff member updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update staff member');
    },
  });

  const deleteStaff = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', business?.id] });
      toast.success('Staff member removed successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove staff member');
    },
  });

  return {
    staff,
    isLoading,
    error,
    createStaff,
    updateStaff,
    deleteStaff,
  };
}
