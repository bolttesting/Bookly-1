import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface PackageTemplate {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  booking_limit: number;
  duration_type: 'days' | 'weeks' | 'months' | 'years';
  duration_value: number;
  status: 'active' | 'inactive';
  image_urls?: string[] | null;
  created_at: string;
  updated_at: string;
  services?: { id: string; name: string }[];
}

export interface PackageFormData {
  name: string;
  description?: string;
  price: number;
  booking_limit: number;
  duration_type: 'days' | 'weeks' | 'months' | 'years';
  duration_value: number;
  status: 'active' | 'inactive';
  service_ids: string[];
  image_urls?: string[];
}

export function usePackages() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  // Fetch packages
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('package_templates')
        .select(`
          *,
          package_services (
            service_id,
            services (
              id,
              name
            )
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((pkg: any) => ({
        ...pkg,
        services: pkg.package_services?.map((ps: any) => ps.services) || [],
      })) as PackageTemplate[];
    },
    enabled: !!business?.id,
  });

  // Fetch services for package selection
  const { data: services = [] } = useQuery({
    queryKey: ['services', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .eq('business_id', business.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });

  // Create package
  const createPackage = useMutation({
    mutationFn: async (data: PackageFormData) => {
      if (!business?.id) throw new Error('Business not found');

      // Insert package template
      const { data: packageData, error: packageError } = await supabase
        .from('package_templates')
        .insert({
          business_id: business.id,
          name: data.name,
          description: data.description || null,
          price: data.price,
          booking_limit: data.booking_limit,
          duration_type: data.duration_type,
          duration_value: data.duration_value,
          status: data.status,
          image_urls: data.image_urls?.length ? data.image_urls : [],
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // Insert package services
      if (data.service_ids.length > 0) {
        const packageServices = data.service_ids.map((service_id) => ({
          package_template_id: packageData.id,
          service_id,
        }));

        const { error: servicesError } = await supabase
          .from('package_services')
          .insert(packageServices);

        if (servicesError) throw servicesError;
      }

      return packageData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', business?.id] });
      toast.success('Package created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create package: ${error.message}`);
    },
  });

  // Update package
  const updatePackage = useMutation({
    mutationFn: async ({ id, ...data }: PackageFormData & { id: string }) => {
      if (!business?.id) throw new Error('Business not found');

      // Update package template
      const { error: packageError } = await supabase
        .from('package_templates')
        .update({
          name: data.name,
          description: data.description || null,
          price: data.price,
          booking_limit: data.booking_limit,
          duration_type: data.duration_type,
          duration_value: data.duration_value,
          status: data.status,
          image_urls: data.image_urls?.length ? data.image_urls : [],
        })
        .eq('id', id)
        .eq('business_id', business.id);

      if (packageError) throw packageError;

      // Delete existing package services
      const { error: deleteError } = await supabase
        .from('package_services')
        .delete()
        .eq('package_template_id', id);

      if (deleteError) throw deleteError;

      // Insert new package services
      if (data.service_ids.length > 0) {
        const packageServices = data.service_ids.map((service_id) => ({
          package_template_id: id,
          service_id,
        }));

        const { error: servicesError } = await supabase
          .from('package_services')
          .insert(packageServices);

        if (servicesError) throw servicesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', business?.id] });
      toast.success('Package updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update package: ${error.message}`);
    },
  });

  // Delete package
  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      if (!business?.id) throw new Error('Business not found');

      const { error } = await supabase
        .from('package_templates')
        .delete()
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages', business?.id] });
      toast.success('Package deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete package: ${error.message}`);
    },
  });

  return {
    packages,
    services,
    isLoading,
    createPackage,
    updatePackage,
    deletePackage,
  };
}

