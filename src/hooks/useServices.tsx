import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  category: string | null;
  status: string;
  buffer_time: number;
  slot_capacity: number;
  image_urls?: string[] | null;
  business_id: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceFormData {
  name: string;
  description?: string;
  duration: number;
  price: number;
  category?: string;
  status: string;
  buffer_time: number;
  slot_capacity: number;
  image_urls?: string[];
}

export function useServices() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: services = [], isLoading, error } = useQuery({
    queryKey: ['services', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!business?.id,
  });

  const createService = useMutation({
    mutationFn: async (serviceData: ServiceFormData) => {
      if (!business?.id) throw new Error('No business found');

      const { data, error } = await supabase
        .from('services')
        .insert({
          business_id: business.id,
          name: serviceData.name,
          description: serviceData.description || null,
          duration: serviceData.duration,
          price: serviceData.price,
          category: serviceData.category || null,
          status: serviceData.status,
          buffer_time: serviceData.buffer_time,
          slot_capacity: serviceData.slot_capacity,
          image_urls: serviceData.image_urls?.length ? serviceData.image_urls : [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', business?.id] });
      toast.success('Service created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create service');
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...serviceData }: ServiceFormData & { id: string }) => {
      const { data, error } = await supabase
        .from('services')
        .update({
          name: serviceData.name,
          description: serviceData.description || null,
          duration: serviceData.duration,
          price: serviceData.price,
          category: serviceData.category || null,
          status: serviceData.status,
          buffer_time: serviceData.buffer_time,
          slot_capacity: serviceData.slot_capacity,
          image_urls: serviceData.image_urls?.length ? serviceData.image_urls : [],
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', business?.id] });
      toast.success('Service updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update service');
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', business?.id] });
      toast.success('Service deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete service');
    },
  });

  return {
    services,
    isLoading,
    error,
    createService,
    updateService,
    deleteService,
  };
}
