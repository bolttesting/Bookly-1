import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  total_visits: number;
  total_spent: number;
  user_id: string | null;
  business_id: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  status: string;
}

export function useCustomers() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!business?.id,
  });

  const createCustomer = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      if (!business?.id) throw new Error('No business found');

      const { data, error } = await supabase
        .from('customers')
        .insert({
          business_id: business.id,
          name: customerData.name,
          email: customerData.email || null,
          phone: customerData.phone || null,
          notes: customerData.notes || null,
          status: customerData.status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', business?.id] });
      toast.success('Customer added successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add customer');
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...customerData }: CustomerFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update({
          name: customerData.name,
          email: customerData.email || null,
          phone: customerData.phone || null,
          notes: customerData.notes || null,
          status: customerData.status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', business?.id] });
      toast.success('Customer updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update customer');
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', business?.id] });
      toast.success('Customer deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
    },
  });

  // Calculate stats
  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === 'active').length,
    vip: customers.filter((c) => c.status === 'vip').length,
    inactive: customers.filter((c) => c.status === 'inactive').length,
  };

  return {
    customers,
    stats,
    isLoading,
    error,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
