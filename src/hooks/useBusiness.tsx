import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Business {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  timezone: string | null;
  logo_url: string | null;
  currency: string | null;
  stripe_account_id: string | null;
  stripe_connected: boolean | null;
  stripe_onboarding_complete: boolean | null;
}

export function useBusiness() {
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedRef = useRef(false);
  const fetchingRef = useRef(false);
  const userIdRef = useRef<string | undefined>(undefined);
  const businessRef = useRef<Business | null>(null);

  // Keep business ref in sync with state
  useEffect(() => {
    businessRef.current = business;
  }, [business]);

  const fetchBusiness = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current) return;
    
    if (!user) {
      setBusiness(null);
      setLoading(false);
      hasFetchedRef.current = false;
      userIdRef.current = undefined;
      businessRef.current = null;
      return;
    }

    // If user ID hasn't changed and we already have a business, don't refetch
    if (userIdRef.current === user.id && hasFetchedRef.current && businessRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    userIdRef.current = user.id;

    try {
      // First get the user's business_id from user_roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        throw roleError;
      }

      if (!roleData?.business_id) {
        setBusiness(null);
        businessRef.current = null;
        setLoading(false);
        hasFetchedRef.current = true;
        fetchingRef.current = false;
        return;
      }

      // Then fetch the business details
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', roleData.business_id)
        .single();

      if (businessError) {
        console.error('Error fetching business:', businessError);
        throw businessError;
      }

      setBusiness(businessData);
      businessRef.current = businessData;
      hasFetchedRef.current = true;
    } catch (err) {
      console.error('Error in fetchBusiness:', err);
      setError(err as Error);
      // Don't clear business on error if we already have one
      // This prevents the dashboard from disappearing on transient errors
      if (!businessRef.current) {
        setBusiness(null);
        businessRef.current = null;
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [user?.id]); // Only depend on user.id

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // Only fetch if user ID changed or we haven't fetched yet
        if (userIdRef.current !== user.id || !hasFetchedRef.current) {
          fetchBusiness();
        }
      } else {
        // User logged out
        setBusiness(null);
        businessRef.current = null;
        setLoading(false);
        hasFetchedRef.current = false;
        userIdRef.current = undefined;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]); // Only depend on user.id and authLoading

  const createBusiness = async (businessData: {
    name: string;
    industry?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    currency?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    // Create slug from business name
    const slug = businessData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Insert the business
    const { data: newBusiness, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessData.name,
        slug: `${slug}-${Date.now()}`,
        industry: businessData.industry || null,
        phone: businessData.phone || null,
        email: businessData.email || null,
        address: businessData.address || null,
        city: businessData.city || null,
        currency: businessData.currency || 'USD',
      })
      .select()
      .single();

    if (businessError) throw businessError;

    // Create the user role (owner)
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        business_id: newBusiness.id,
        role: 'owner',
      });

    if (roleError) throw roleError;

    setBusiness(newBusiness);
    return newBusiness;
  };

  const updateBusiness = async (updates: Partial<Business>) => {
    if (!business || !user) throw new Error('Business or user not found');

    const { data: updatedBusiness, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', business.id)
      .select()
      .single();

    if (error) throw error;

    setBusiness(updatedBusiness);
    return updatedBusiness;
  };

  return {
    business,
    loading: authLoading || loading,
    error,
    createBusiness,
    updateBusiness,
    refetch: fetchBusiness,
  };
}
