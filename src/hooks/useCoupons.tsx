import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface Coupon {
  id: string;
  business_id: string;
  code: string;
  name: string | null;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  applicable_to: 'all' | 'services' | 'packages';
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
  applicable_services?: { id: string; name: string }[];
  applicable_packages?: { id: string; name: string }[];
}

export interface CouponFormData {
  code: string;
  name?: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_purchase_amount?: number;
  max_discount_amount?: number;
  usage_limit?: number;
  valid_from: string;
  valid_until?: string;
  applicable_to: 'all' | 'services' | 'packages';
  status: 'active' | 'inactive';
  service_ids?: string[];
  package_ids?: string[];
}

export function useCoupons() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('coupons')
        .select(`
          *,
          coupon_applicable_services (
            service_id,
            services (
              id,
              name
            )
          ),
          coupon_applicable_packages (
            package_template_id,
            package_templates (
              id,
              name
            )
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((coupon: any) => ({
        ...coupon,
        applicable_services: coupon.coupon_applicable_services?.map((cas: any) => cas.services).filter(Boolean) || [],
        applicable_packages: coupon.coupon_applicable_packages?.map((cap: any) => cap.package_templates).filter(Boolean) || [],
      })) as Coupon[];
    },
    enabled: !!business?.id,
  });

  // Fetch services for coupon selection
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

  // Fetch packages for coupon selection
  const { data: packages = [] } = useQuery({
    queryKey: ['packages', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('package_templates')
        .select('id, name')
        .eq('business_id', business.id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!business?.id,
  });

  // Create coupon
  const createCoupon = useMutation({
    mutationFn: async (data: CouponFormData) => {
      if (!business?.id) throw new Error('Business not found');

      // Insert coupon
      const { data: couponData, error: couponError } = await supabase
        .from('coupons')
        .insert({
          business_id: business.id,
          code: data.code.toUpperCase().trim(),
          name: data.name || null,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_purchase_amount: data.min_purchase_amount || null,
          max_discount_amount: data.max_discount_amount || null,
          usage_limit: data.usage_limit || null,
          valid_from: data.valid_from,
          valid_until: data.valid_until || null,
          applicable_to: data.applicable_to,
          status: data.status,
        })
        .select()
        .single();

      if (couponError) throw couponError;

      // Insert applicable services if needed
      if (data.applicable_to === 'services' && data.service_ids && data.service_ids.length > 0) {
        const applicableServices = data.service_ids.map((service_id) => ({
          coupon_id: couponData.id,
          service_id,
        }));

        const { error: servicesError } = await supabase
          .from('coupon_applicable_services')
          .insert(applicableServices);

        if (servicesError) throw servicesError;
      }

      // Insert applicable packages if needed
      if (data.applicable_to === 'packages' && data.package_ids && data.package_ids.length > 0) {
        const applicablePackages = data.package_ids.map((package_template_id) => ({
          coupon_id: couponData.id,
          package_template_id,
        }));

        const { error: packagesError } = await supabase
          .from('coupon_applicable_packages')
          .insert(applicablePackages);

        if (packagesError) throw packagesError;
      }

      return couponData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', business?.id] });
      toast.success('Coupon created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create coupon: ${error.message}`);
    },
  });

  // Update coupon
  const updateCoupon = useMutation({
    mutationFn: async ({ id, ...data }: CouponFormData & { id: string }) => {
      if (!business?.id) throw new Error('Business not found');

      // Update coupon
      const { error: couponError } = await supabase
        .from('coupons')
        .update({
          code: data.code.toUpperCase().trim(),
          name: data.name || null,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_purchase_amount: data.min_purchase_amount || null,
          max_discount_amount: data.max_discount_amount || null,
          usage_limit: data.usage_limit || null,
          valid_from: data.valid_from,
          valid_until: data.valid_until || null,
          applicable_to: data.applicable_to,
          status: data.status,
        })
        .eq('id', id)
        .eq('business_id', business.id);

      if (couponError) throw couponError;

      // Delete existing applicable services
      const { error: deleteServicesError } = await supabase
        .from('coupon_applicable_services')
        .delete()
        .eq('coupon_id', id);

      if (deleteServicesError) throw deleteServicesError;

      // Delete existing applicable packages
      const { error: deletePackagesError } = await supabase
        .from('coupon_applicable_packages')
        .delete()
        .eq('coupon_id', id);

      if (deletePackagesError) throw deletePackagesError;

      // Insert new applicable services if needed
      if (data.applicable_to === 'services' && data.service_ids && data.service_ids.length > 0) {
        const applicableServices = data.service_ids.map((service_id) => ({
          coupon_id: id,
          service_id,
        }));

        const { error: servicesError } = await supabase
          .from('coupon_applicable_services')
          .insert(applicableServices);

        if (servicesError) throw servicesError;
      }

      // Insert new applicable packages if needed
      if (data.applicable_to === 'packages' && data.package_ids && data.package_ids.length > 0) {
        const applicablePackages = data.package_ids.map((package_template_id) => ({
          coupon_id: id,
          package_template_id,
        }));

        const { error: packagesError } = await supabase
          .from('coupon_applicable_packages')
          .insert(applicablePackages);

        if (packagesError) throw packagesError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', business?.id] });
      toast.success('Coupon updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update coupon: ${error.message}`);
    },
  });

  // Delete coupon
  const deleteCoupon = useMutation({
    mutationFn: async (id: string) => {
      if (!business?.id) throw new Error('Business not found');

      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id)
        .eq('business_id', business.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons', business?.id] });
      toast.success('Coupon deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete coupon: ${error.message}`);
    },
  });

  // Validate coupon (for use in booking flow)
  const validateCoupon = async (
    code: string,
    purchaseAmount: number,
    serviceId?: string,
    packageTemplateId?: string
  ) => {
    if (!business?.id) throw new Error('Business not found');

    const { data, error } = await supabase.rpc('validate_coupon', {
      _coupon_code: code,
      _business_id: business.id,
      _purchase_amount: purchaseAmount,
      _service_id: serviceId || null,
      _package_template_id: packageTemplateId || null,
    });

    if (error) throw error;
    return data?.[0] || null;
  };

  return {
    coupons,
    services,
    packages,
    isLoading,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
  };
}

