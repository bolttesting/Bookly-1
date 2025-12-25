import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface Location {
  id: string;
  business_id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LocationFormData {
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  is_primary?: boolean;
  status?: string;
}

export function useLocations() {
  const queryClient = useQueryClient();
  const { business } = useBusiness();

  const { data: locations = [], isLoading, error } = useQuery({
    queryKey: ['locations', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', business.id)
        .order('is_primary', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as Location[];
    },
    enabled: !!business?.id,
  });

  const createLocation = useMutation({
    mutationFn: async (locationData: LocationFormData) => {
      if (!business?.id) throw new Error('No business found');

      // If this is the first location or marked as primary, ensure it's the only primary
      if (locationData.is_primary || locations.length === 0) {
        await supabase
          .from('business_locations')
          .update({ is_primary: false })
          .eq('business_id', business.id);
      }

      const { data, error } = await supabase
        .from('business_locations')
        .insert({
          business_id: business.id,
          name: locationData.name,
          address: locationData.address || null,
          city: locationData.city || null,
          phone: locationData.phone || null,
          email: locationData.email || null,
          is_primary: locationData.is_primary ?? locations.length === 0,
          status: locationData.status || 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add location');
      console.error('Error creating location:', error);
    },
  });

  const updateLocation = useMutation({
    mutationFn: async ({ id, ...locationData }: LocationFormData & { id: string }) => {
      if (!business?.id) throw new Error('No business found');

      // If marking as primary, unset other primaries
      if (locationData.is_primary) {
        await supabase
          .from('business_locations')
          .update({ is_primary: false })
          .eq('business_id', business.id)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('business_locations')
        .update({
          name: locationData.name,
          address: locationData.address,
          city: locationData.city,
          phone: locationData.phone,
          email: locationData.email,
          is_primary: locationData.is_primary,
          status: locationData.status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update location');
      console.error('Error updating location:', error);
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('business_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete location');
      console.error('Error deleting location:', error);
    },
  });

  return {
    locations,
    isLoading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}
