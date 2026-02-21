import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users,
  LogOut, 
  CalendarPlus, 
  Briefcase, 
  Package, 
  ShoppingBag,
  DollarSign,
  Search,
  ArrowRight,
  CheckCircle,
  Tag,
  Settings,
  Eye,
  EyeOff,
  Camera,
  CalendarClock,
  Repeat,
  CalendarIcon
} from 'lucide-react';
import { format, isPast, isFuture, isToday, addMinutes, setHours, setMinutes, startOfDay, isBefore, isAfter, addDays, differenceInHours, startOfWeek } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { formatCurrencySimple } from '@/lib/currency';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { CustomerDashboardSidebar, type CustomerDashboardTab } from '@/components/CustomerDashboardSidebar';
import { RescheduleRequestDialog } from '@/components/appointments/RescheduleRequestDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ImageSlideshow } from '@/components/ImageSlideshow';
import { useScheduledClasses, type ScheduledClassRow } from '@/hooks/useScheduledClasses';

interface Business {
  id: string;
  name: string;
  slug: string;
  currency: string | null;
  use_class_schedule?: boolean | null;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  category: string | null;
  business_id: string;
  buffer_time: number;
  slot_capacity: number;
}

interface PackageTemplate {
  id: string;
  name: string;
  description: string | null;
  price: number;
  booking_limit: number;
  duration_type: string;
  duration_value: number;
  business_id: string;
  services?: { id: string; name: string }[];
}

interface StaffMember {
  id: string;
  name: string;
  role: string | null;
  business_id: string;
}

interface BusinessHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export default function MyAppointments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, signOut } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const { profile, loading: profileLoading, uploadAvatar, updateProfile, isUploading } = useProfile();
  const [activeTab, setActiveTab] = useState<CustomerDashboardTab>('appointments');
  const [searchQuery, setSearchQuery] = useState('');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<{
    id: string;
    start_time: string;
    end_time: string;
    business_id: string;
    service_id: string;
    location_id?: string | null;
    service?: { name: string; duration: number; buffer_time?: number; slot_capacity?: number } | null;
    businessDeadlineHours?: number | null;
  } | null>(null);
  
  // Profile editing state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize profile fields when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(prev => prev || profile.first_name || '');
      setLastName(prev => prev || profile.last_name || '');
      setEmail(prev => prev || profile.email || user?.email || '');
      setPhone(prev => prev || profile.phone || '');
    }
  }, [profile, user]);

  // Booking state
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ id: string; name: string; address: string | null } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; couponId: string; discount: number; discountType: 'percentage' | 'fixed' } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'weekly' | 'monthly'>('weekly');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [recurrenceMaxOccurrences, setRecurrenceMaxOccurrences] = useState<number | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'occurrences'>('never');
  const [selectedCustomerPackageId, setSelectedCustomerPackageId] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  // Class schedule flow (when business has use_class_schedule)
  const [classScheduleMode, setClassScheduleMode] = useState(false);
  const [classStep, setClassStep] = useState<1 | 2 | 3>(2);
  const [classSelectedDate, setClassSelectedDate] = useState<Date | undefined>();
  const [classSelectedSlot, setClassSelectedSlot] = useState<ScheduledClassRow | null>(null);
  const [classFilterClass, setClassFilterClass] = useState<string>('');
  const [classFilterInstructor, setClassFilterInstructor] = useState<string>('');
  const [classFilterFacility, setClassFilterFacility] = useState<string>('');
  // Buy Package: confirm dialog with coupon
  const [packagePurchaseDialogOpen, setPackagePurchaseDialogOpen] = useState(false);
  const [packageToPurchase, setPackageToPurchase] = useState<PackageTemplate | null>(null);
  const [buyPackageCouponCode, setBuyPackageCouponCode] = useState('');
  const [buyPackageAppliedCoupon, setBuyPackageAppliedCoupon] = useState<{ code: string; couponId: string; discount: number; discountType: 'percentage' | 'fixed' } | null>(null);
  const [buyPackageCouponError, setBuyPackageCouponError] = useState('');
  const [isApplyingBuyPackageCoupon, setIsApplyingBuyPackageCoupon] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHasMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Get businesses customer is associated with
  const { data: businesses = [], refetch: refetchBusinesses } = useQuery({
    queryKey: ['customer-businesses', user?.id],
    staleTime: 60_000, // 1 min - avoid refetch on tab switch/refresh
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: customers, error } = await supabase
        .from('customers')
        .select('business_id')
        .eq('user_id', user.id);

      if (error) throw error;
      if (!customers || customers.length === 0) return [];

      const businessIds = [...new Set(customers.map(c => c.business_id))];

      const { data: businessesData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name, slug, currency, use_class_schedule')
        .in('id', businessIds);

      if (businessError) throw businessError;
      return businessesData || [];
    },
    enabled: !!user?.id,
  });

  // Search for businesses
  const { data: searchableBusinesses = [] } = useQuery({
    queryKey: ['search-businesses', businessSearchQuery],
    queryFn: async () => {
      if (!businessSearchQuery || businessSearchQuery.length < 2) return [];

      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, slug, currency, use_class_schedule')
        .or(`name.ilike.%${businessSearchQuery}%,slug.ilike.%${businessSearchQuery}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: businessSearchQuery.length >= 2 && showBusinessSelector,
  });

  // Link to a business (create customer record)
  const linkToBusiness = useMutation({
    mutationFn: async (businessId: string) => {
      if (!user?.id) throw new Error('User not found');

      // Check if customer already exists
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        return existing;
      }

      // Get user profile for name/email
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user.id)
        .single();

      // Create customer record
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          user_id: user.id,
          name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Customer' : user.email?.split('@')[0] || 'Customer',
          email: profile?.email || user.email || null,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;
      return customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['customer-services'] });
      queryClient.invalidateQueries({ queryKey: ['customer-packages'] });
      setShowBusinessSelector(false);
      setBusinessSearchQuery('');
      toast.success('Successfully linked to business!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to link to business');
    },
  });

  // Get appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['my-appointments', user?.id],
    staleTime: 30_000, // 30s - reduce refetch on refresh
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, business_id')
        .eq('user_id', user.id);

      if (customerError) throw customerError;
      if (!customers || customers.length === 0) return [];

      const customerIds = customers.map(c => c.id);

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          notes,
          price,
          service_id,
          staff_id,
          business_id,
          location_id
        `)
        .in('customer_id', customerIds)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const serviceIds = [...new Set(data.map(a => a.service_id))];
      const staffIds = [...new Set(data.map(a => a.staff_id).filter(Boolean))];
      const businessIds = [...new Set(data.map(a => a.business_id))];

      const [servicesRes, staffRes, businessesRes] = await Promise.all([
        supabase.from('services').select('id, name, duration, buffer_time, slot_capacity').in('id', serviceIds),
        staffIds.length > 0 
          ? supabase.from('staff_members').select('id, name').in('id', staffIds)
          : Promise.resolve({ data: [] }),
        supabase.from('businesses').select('id, name, address, city, currency, reschedule_deadline_hours').in('id', businessIds),
      ]);

      const services = servicesRes.data || [];
      const staff = staffRes.data || [];
      const businesses = businessesRes.data || [];

      // Get all appointments for the same slots to count people
      // Group by business_id, service_id, and start_time
      const uniqueSlots = Array.from(
        new Map(
          data.map(apt => [
            `${apt.business_id}|${apt.service_id}|${apt.start_time}`,
            {
              business_id: apt.business_id,
              service_id: apt.service_id,
              start_time: apt.start_time,
            }
          ])
        ).values()
      );

      // Count appointments for each unique slot
      const slotCounts: Record<string, number> = {};
      
      for (const slot of uniqueSlots) {
        const slotKey = `${slot.business_id}|${slot.service_id}|${slot.start_time}`;
        const { count, error: countError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', slot.business_id)
          .eq('service_id', slot.service_id)
          .eq('start_time', slot.start_time)
          .in('status', ['confirmed', 'pending', 'completed']);

        if (!countError) {
          slotCounts[slotKey] = count || 1;
        } else {
          slotCounts[slotKey] = 1; // Fallback
        }
      }

      // Map appointments with counts
      return data.map(apt => {
        const slotKey = `${apt.business_id}|${apt.service_id}|${apt.start_time}`;
        return {
        ...apt,
        service: services.find(s => s.id === apt.service_id),
        staff: staff.find(s => s.id === apt.staff_id),
        business: businesses.find(b => b.id === apt.business_id),
          totalPeopleInSlot: slotCounts[slotKey] || 1,
        };
      });
    },
    enabled: !!user?.id,
  });

  // Get services from customer's businesses
  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['customer-services', businesses.map(b => b.id)],
    queryFn: async () => {
      if (businesses.length === 0) return [];

      const businessIds = businesses.map(b => b.id);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .in('business_id', businessIds)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: businesses.length > 0,
  });

  // Get packages from customer's businesses
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ['customer-packages', businesses.map(b => b.id)],
    queryFn: async () => {
      if (businesses.length === 0) return [];

      const businessIds = businesses.map(b => b.id);
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
        .in('business_id', businessIds)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      return (data || []).map((pkg: any) => ({
        ...pkg,
        services: pkg.package_services?.map((ps: any) => ps.services).filter(Boolean) || [],
      }));
    },
    enabled: businesses.length > 0,
  });

  // Get customer packages (purchased)
  const { data: myPackages = [] } = useQuery({
    queryKey: ['my-packages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: customers } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id);

      if (!customers || customers.length === 0) return [];
      const customerIds = customers.map(c => c.id);

      const { data, error } = await supabase
        .from('customer_packages')
        .select(`
          *,
          package_templates (
            id,
            name,
            description
          )
        `)
        .in('customer_id', customerIds)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Get staff for selected business
  const { data: staff = [] } = useQuery({
    queryKey: ['staff', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];

      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .eq('status', 'available')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id,
  });

  // Get locations for selected business
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];

      const { data, error } = await supabase
        .from('business_locations')
        .select('id, name, address')
        .eq('business_id', selectedBusiness.id)
        .eq('status', 'active')
        .order('is_primary', { ascending: false })
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id,
  });

  // Get business hours (all - default + per-location for slot generation)
  const { data: businessHours = [] } = useQuery({
    queryKey: ['business-hours', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];

      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('day_of_week')
        .order('location_id', { ascending: true, nullsFirst: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id,
  });

  // Get split hour ranges (multiple ranges per day)
  const { data: hourRangesByBhId = {} } = useQuery({
    queryKey: ['business-hour-ranges', selectedBusiness?.id, businessHours.map(h => h.id).filter(Boolean)],
    queryFn: async (): Promise<Record<string, Array<{ start_time: string; end_time: string }>>> => {
      const bhIds = businessHours.filter((h: any) => h.id).map((h: any) => h.id);
      if (bhIds.length === 0) return {};

      const { data, error } = await supabase
        .from('business_hour_ranges')
        .select('business_hours_id, start_time, end_time')
        .in('business_hours_id', bhIds)
        .order('display_order')
        .order('start_time');

      if (error) throw error;
      const map: Record<string, Array<{ start_time: string; end_time: string }>> = {};
      for (const r of data || []) {
        const bid = (r as any).business_hours_id;
        if (!map[bid]) map[bid] = [];
        map[bid].push({
          start_time: String((r as any).start_time).slice(0, 5),
          end_time: String((r as any).end_time).slice(0, 5),
        });
      }
      return map;
    },
    enabled: !!selectedBusiness?.id && businessHours.length > 0,
  });

  // Get blocked slots for this service and date
  const { data: slotBlocks = [] } = useQuery({
    queryKey: ['slot-blocks', selectedBusiness?.id, selectedService?.id, selectedDate],
    queryFn: async () => {
      if (!selectedBusiness?.id || !selectedService?.id || !selectedDate) return [];

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('slot_blocks')
        .select('start_time')
        .eq('business_id', selectedBusiness.id)
        .eq('service_id', selectedService.id)
        .eq('blocked_date', dateStr);

      if (error) throw error;
      return (data || []).map((b: any) => ({
        start_time: String(b.start_time).slice(0, 5),
      }));
    },
    enabled: !!selectedBusiness?.id && !!selectedService?.id && !!selectedDate,
  });

  // Get service-specific schedules (when each service is bookable per day)
  const { data: serviceSchedules = {} } = useQuery({
    queryKey: ['service-schedules', selectedBusiness?.id],
    queryFn: async (): Promise<Record<string, Record<number, Array<{ start_time: string; end_time: string }>>>> => {
      if (!selectedBusiness?.id || !selectedService?.id) return {};

      const { data, error } = await supabase
        .from('service_schedules')
        .select('service_id, day_of_week, start_time, end_time')
        .eq('service_id', selectedService.id)
        .order('display_order')
        .order('start_time');

      if (error) throw error;
      const map: Record<string, Record<number, Array<{ start_time: string; end_time: string }>>> = {};
      for (const s of data || []) {
        const sid = (s as any).service_id;
        const day = (s as any).day_of_week;
        if (!map[sid]) map[sid] = {};
        if (!map[sid][day]) map[sid][day] = [];
        map[sid][day].push({
          start_time: String((s as any).start_time).slice(0, 5),
          end_time: String((s as any).end_time).slice(0, 5),
        });
      }
      return map;
    },
    enabled: !!selectedBusiness?.id && !!selectedService?.id,
  });

  // Get off days (location-specific + default when location selected)
  const { data: offDaysData = [] } = useQuery({
    queryKey: ['off-days', selectedBusiness?.id, selectedLocation?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];

      let query = supabase
        .from('off_days')
        .select('off_date')
        .eq('business_id', selectedBusiness.id);

      if (selectedLocation) {
        query = query.or(`location_id.eq.${selectedLocation.id},location_id.is.null`);
      } else {
        query = query.is('location_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id,
  });

  const offDays = offDaysData.map((d: { off_date: string }) => d.off_date);

  // Auto-select single location
  useEffect(() => {
    if (locations.length === 1 && !selectedLocation) {
      setSelectedLocation(locations[0]);
    }
  }, [locations, selectedLocation]);

  // Get appointments for availability
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ['appointments-availability', selectedBusiness?.id, selectedDate],
    queryFn: async () => {
      if (!selectedBusiness?.id || !selectedDate) return [];

      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, service_id')
        .eq('business_id', selectedBusiness.id)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .in('status', ['confirmed', 'pending']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id && !!selectedDate,
  });

  // Class schedule: scheduled classes and appointments for spots (when business uses class schedule)
  const { rows: scheduledClasses = [], isLoading: scheduledClassesLoading } = useScheduledClasses(
    classScheduleMode && selectedBusiness?.id ? selectedBusiness.id : null
  );

  const { data: classModeAppointments = [] } = useQuery({
    queryKey: ['class-mode-appointments', selectedBusiness?.id, classScheduleMode],
    queryFn: async () => {
      if (!selectedBusiness?.id || !classScheduleMode) return [];
      const rangeStart = new Date();
      const rangeEnd = addDays(new Date(), 30);
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time, service_id, location_id, staff_id')
        .eq('business_id', selectedBusiness.id)
        .gte('start_time', rangeStart.toISOString())
        .lte('start_time', rangeEnd.toISOString())
        .in('status', ['confirmed', 'pending']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id && classScheduleMode,
  });

  // Generate time slots with availability
  interface SlotAvailability {
    time: string;
    booked: number;
    capacity: number;
    available: number;
  }

  const generateTimeSlots = (): SlotAvailability[] => {
    if (!selectedDate || !selectedService || !selectedBusiness) return [];

    const dayOfWeek = selectedDate.getDay();
    // Location-specific hours first, then default
    let dayHours = selectedLocation
      ? businessHours.find((h: any) => h.day_of_week === dayOfWeek && h.location_id === selectedLocation.id && !h.is_closed)
      : null;
    if (!dayHours) {
      dayHours = businessHours.find((h: any) => h.day_of_week === dayOfWeek && h.location_id === null && !h.is_closed);
    }
    
    if (!dayHours || dayHours.is_closed) return [];

    const openTime = dayHours.open_time || '09:00';
    const closeTime = dayHours.close_time || '18:00';
    const slotInterval = selectedService.duration + (selectedService.buffer_time || 0);
    const capacity = selectedService.slot_capacity || 1;
    const now = new Date();

    // Service-specific schedule takes precedence, then split hours, then single range
    const serviceDayRanges = serviceSchedules[selectedService.id]?.[dayOfWeek];
    const splitRanges = dayHours.id && hourRangesByBhId[dayHours.id]?.length
      ? hourRangesByBhId[dayHours.id]
      : null;
    const ranges: Array<{ start_time: string; end_time: string }> = serviceDayRanges?.length
      ? serviceDayRanges
      : splitRanges?.length
        ? splitRanges
        : [{ start_time: openTime, end_time: closeTime }];

    const blockedTimes = new Set(slotBlocks.map((b: { start_time: string }) => b.start_time));

    const slots: SlotAvailability[] = [];
    for (const range of ranges) {
      const [openH, openM] = range.start_time.split(':').map(Number);
      const [closeH, closeM] = range.end_time.split(':').map(Number);
      let current = setMinutes(setHours(startOfDay(selectedDate), openH), openM);
      const end = setMinutes(setHours(startOfDay(selectedDate), closeH), closeM);

      while (isBefore(current, end)) {
        const appointmentEnd = addMinutes(current, selectedService.duration);
        if (isAfter(appointmentEnd, end)) break;

        const timeStr = format(current, 'HH:mm');
        if (blockedTimes.has(timeStr)) {
          current = addMinutes(current, slotInterval);
          continue;
        }

        if (!isBefore(current, now)) {
          const booked = existingAppointments.filter(apt => {
            const aptDate = new Date(apt.start_time);
            return format(aptDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') &&
                   format(aptDate, 'HH:mm') === timeStr &&
                   apt.service_id === selectedService.id;
          }).length;

          const available = capacity - booked;
          
          if (available > 0) {
            slots.push({
              time: timeStr,
              booked,
              capacity,
              available
            });
          }
        }
        current = addMinutes(current, slotInterval);
      }
    }

    return slots;
  };

  // Handle booking
  const handleBooking = useMutation({
    mutationFn: async () => {
      if (!selectedBusiness || !selectedService || !selectedDate || !selectedTime || !user) {
        throw new Error('Please fill in all required fields');
      }

      // Get or create customer (need id, name, email for confirmation email)
      let { data: customer } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('business_id', selectedBusiness.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) {
        // Create customer record if it doesn't exist
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: selectedBusiness.id,
            user_id: user.id,
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Customer' : user.email?.split('@')[0] || 'Customer',
            email: profile?.email || user.email || null,
            status: 'active',
          })
          .select('id, name, email')
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      const basePrice = Number(selectedService.price);
      let finalPrice = basePrice;
      const usingPackage = !!selectedCustomerPackageId;

      if (usingPackage) {
        // Validate and consume one package credit
        const { data: pkgRow, error: pkgErr } = await supabase
          .from('customer_packages')
          .select('id, bookings_remaining, bookings_used')
          .eq('id', selectedCustomerPackageId)
          .single();
        if (pkgErr || !pkgRow || (pkgRow.bookings_remaining ?? 0) <= 0) {
          throw new Error('This package has no credits left. Please book without package or choose another.');
        }
        const { error: updateErr } = await supabase
          .from('customer_packages')
          .update({
            bookings_remaining: Math.max(0, (pkgRow.bookings_remaining ?? 0) - 1),
            bookings_used: (pkgRow.bookings_used ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedCustomerPackageId);
        if (updateErr) throw updateErr;
        finalPrice = 0;
      } else if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
          finalPrice = basePrice - (basePrice * appliedCoupon.discount / 100);
        } else {
          finalPrice = Math.max(0, basePrice - appliedCoupon.discount);
        }
      }

      // If recurring, create a series instead of a single appointment
      if (isRecurring) {
        // Create recurring series
        const { data: newSeries, error: seriesError } = await supabase
          .from('recurring_appointment_series')
          .insert({
            business_id: selectedBusiness.id,
            customer_id: customer.id,
            service_id: selectedService.id,
            staff_id: selectedStaff?.id || null,
            location_id: selectedLocation?.id || null,
            recurrence_pattern: recurrencePattern,
            recurrence_frequency: recurrenceFrequency,
            start_date: format(selectedDate, 'yyyy-MM-dd'),
            end_date: recurrenceEndType === 'date' && recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : null,
            max_occurrences: recurrenceEndType === 'occurrences' ? recurrenceMaxOccurrences : null,
            time_of_day: selectedTime,
            notes: bookingNotes || null,
            price: finalPrice,
            status: 'active',
          })
          .select()
          .single();

        if (seriesError) throw seriesError;

        // Generate initial appointments
        const generateUntilDate = recurrenceEndType === 'date' && recurrenceEndDate
          ? format(recurrenceEndDate, 'yyyy-MM-dd')
          : format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'); // 3 months ahead

        const { error: generateError } = await supabase.rpc('generate_recurring_appointments', {
          series_id: newSeries.id,
          generate_until_date: generateUntilDate,
        });

        if (generateError) {
          console.error('Error generating initial appointments:', generateError);
          // Don't fail, just warn
        }

        // Record coupon usage for recurring
        if (appliedCoupon?.couponId && customer?.id) {
          const discountAmount = basePrice - finalPrice;
          try {
            await supabase.rpc('record_coupon_usage', {
              _coupon_id: appliedCoupon.couponId,
              _customer_id: customer.id,
              _user_id: user?.id || null,
              _order_id: newSeries.id,
              _discount_amount: discountAmount,
            });
          } catch (couponErr) {
            console.error('Failed to record coupon usage:', couponErr);
          }
        }

        return { id: newSeries.id, isRecurring: true };
      }

      // Create single appointment (respect auto_confirm_bookings)
      const { data: rs } = await supabase
        .from('reminder_settings')
        .select('auto_confirm_bookings, send_booking_confirmation')
        .eq('business_id', selectedBusiness.id)
        .maybeSingle();
      const bookingStatus = (rs?.auto_confirm_bookings === true) ? 'confirmed' : 'pending';

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, selectedService.duration);

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          business_id: selectedBusiness.id,
          customer_id: customer.id,
          service_id: selectedService.id,
          staff_id: selectedStaff?.id || null,
          location_id: selectedLocation?.id || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          price: finalPrice,
          status: bookingStatus,
          notes: bookingNotes || null,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Send booking confirmation email when enabled
      if (rs?.send_booking_confirmation !== false && customer?.email) {
        try {
          const [hours, minutes] = selectedTime.split(':').map(Number);
          const startTimeIso = setMinutes(setHours(selectedDate, hours), minutes).toISOString();
          await supabase.functions.invoke('send-booking-confirmation', {
            body: {
              appointmentId: appointment.id,
              business_id: selectedBusiness.id,
              customerEmail: customer.email,
              customerName: customer.name ?? 'Customer',
              serviceName: selectedService.name,
              businessName: selectedBusiness.name,
              startTime: startTimeIso,
              staffName: selectedStaff?.name,
            },
          });
        } catch (confirmErr) {
          console.error('Failed to send booking confirmation email:', confirmErr);
        }
      }

      // Send welcome email for first-time booker when enabled
      if (customer?.email) {
        try {
          const { count } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customer.id)
            .eq('business_id', selectedBusiness.id);
          const isFirstBooking = count === 1;
          if (isFirstBooking) {
            const { data: emailSettings } = await supabase
              .from('reminder_settings')
              .select('send_welcome_email')
              .eq('business_id', selectedBusiness.id)
              .maybeSingle();
            if (emailSettings?.send_welcome_email === true) {
              const { data: biz } = await supabase
                .from('businesses')
                .select('phone, address, city')
                .eq('id', selectedBusiness.id)
                .single();
              await supabase.functions.invoke('send-welcome-email', {
                body: {
                  business_id: selectedBusiness.id,
                  customerEmail: customer.email,
                  customerName: customer.name ?? 'Customer',
                  businessName: selectedBusiness.name,
                  businessPhone: biz?.phone ?? undefined,
                  businessAddress: biz?.address ? `${biz.address}${biz?.city ? `, ${biz.city}` : ''}` : undefined,
                  bookingUrl: `${window.location.origin}/book/${selectedBusiness.slug}`,
                },
              });
            }
          }
        } catch (welcomeErr) {
          console.error('Failed to send welcome email:', welcomeErr);
        }
      }

      // Record coupon usage for single appointment
      if (appliedCoupon?.couponId && customer?.id && appointment?.id) {
        const discountAmount = basePrice - finalPrice;
        try {
          await supabase.rpc('record_coupon_usage', {
            _coupon_id: appliedCoupon.couponId,
            _customer_id: customer.id,
            _user_id: user?.id || null,
            _order_id: appointment.id,
            _discount_amount: discountAmount,
          });
        } catch (couponErr) {
          console.error('Failed to record coupon usage:', couponErr);
        }
      }

      return appointment;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-availability'] });
      if (selectedCustomerPackageId) {
        queryClient.invalidateQueries({ queryKey: ['my-packages'] });
      }
      if (result?.isRecurring) {
        toast.success('Recurring appointment series created successfully!');
      } else {
        toast.success('Appointment booked successfully!');
      }
      setSelectedService(null);
      setSelectedStaff(null);
      setSelectedLocation(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
      setBookingNotes('');
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
      setSelectedCustomerPackageId(null);
      setIsRecurring(false);
      setRecurrencePattern('weekly');
      setRecurrenceFrequency(1);
      setRecurrenceEndDate(null);
      setRecurrenceMaxOccurrences(null);
      setRecurrenceEndType('never');
      setIsBooking(false);
      setActiveTab('appointments');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book appointment');
    },
  });

  // Handle class schedule booking (when business has use_class_schedule)
  const handleClassBooking = useMutation({
    mutationFn: async () => {
      if (!selectedBusiness || !classSelectedSlot || !classSelectedDate || !user) {
        throw new Error('Missing booking details');
      }
      let { data: customer } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('business_id', selectedBusiness.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!customer) {
        const { data: profile } = await supabase.from('profiles').select('first_name, last_name, email').eq('id', user.id).single();
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: selectedBusiness.id,
            user_id: user.id,
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Customer' : user.email?.split('@')[0] || 'Customer',
            email: profile?.email || user.email || null,
            status: 'active',
          })
          .select('id, name, email')
          .single();
        if (customerError) throw customerError;
        customer = newCustomer;
      }
      const usingPackage = !!selectedCustomerPackageId;
      if (usingPackage) {
        const { data: pkgRow, error: pkgErr } = await supabase
          .from('customer_packages')
          .select('id, bookings_remaining, bookings_used')
          .eq('id', selectedCustomerPackageId)
          .single();
        if (pkgErr || !pkgRow || (pkgRow.bookings_remaining ?? 0) <= 0) {
          throw new Error('This package has no credits left.');
        }
        await supabase
          .from('customer_packages')
          .update({
            bookings_remaining: Math.max(0, (pkgRow.bookings_remaining ?? 0) - 1),
            bookings_used: (pkgRow.bookings_used ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', selectedCustomerPackageId);
      }
      const { data: classRs } = await supabase
        .from('reminder_settings')
        .select('auto_confirm_bookings, send_booking_confirmation')
        .eq('business_id', selectedBusiness.id)
        .maybeSingle();
      const classBookingStatus = (classRs?.auto_confirm_bookings === true) ? 'confirmed' : 'pending';

      const [h, m] = String(classSelectedSlot.start_time).slice(0, 5).split(':').map(Number);
      const startTime = setMinutes(setHours(new Date(classSelectedDate), h), m);
      const duration = classSelectedSlot.service?.duration ?? 60;
      const endTime = addMinutes(startTime, duration);
      const servicePrice = safeServices.find((s) => s.id === classSelectedSlot.service_id)?.price ?? 0;
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          business_id: selectedBusiness.id,
          customer_id: customer.id,
          service_id: classSelectedSlot.service_id,
          staff_id: classSelectedSlot.staff_id || null,
          location_id: classSelectedSlot.location_id || null,
          facility_id: classSelectedSlot.facility_id || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          price: usingPackage ? 0 : Number(servicePrice),
          status: classBookingStatus,
          notes: null,
        })
        .select('id')
        .single();
      if (error) throw error;

      // Send booking confirmation email when enabled
      if (classRs?.send_booking_confirmation !== false && customer?.email) {
        try {
          await supabase.functions.invoke('send-booking-confirmation', {
            body: {
              appointmentId: appointment.id,
              business_id: selectedBusiness.id,
              customerEmail: customer.email,
              customerName: customer.name ?? 'Customer',
              serviceName: classSelectedSlot.service?.name ?? 'Class',
              businessName: selectedBusiness.name,
              startTime: startTime.toISOString(),
              staffName: undefined,
            },
          });
        } catch (confirmErr) {
          console.error('Failed to send booking confirmation email:', confirmErr);
        }
      }

      // Send welcome email for first-time booker when enabled
      if (customer?.email) {
        try {
          const { count } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customer.id)
            .eq('business_id', selectedBusiness.id);
          const isFirstBooking = count === 1;
          if (isFirstBooking) {
            const { data: emailSettings } = await supabase
              .from('reminder_settings')
              .select('send_welcome_email')
              .eq('business_id', selectedBusiness.id)
              .maybeSingle();
            if (emailSettings?.send_welcome_email === true) {
              const { data: biz } = await supabase
                .from('businesses')
                .select('phone, address, city')
                .eq('id', selectedBusiness.id)
                .single();
              await supabase.functions.invoke('send-welcome-email', {
                body: {
                  business_id: selectedBusiness.id,
                  customerEmail: customer.email,
                  customerName: customer.name ?? 'Customer',
                  businessName: selectedBusiness.name,
                  businessPhone: biz?.phone ?? undefined,
                  businessAddress: biz?.address ? `${biz.address}${biz?.city ? `, ${biz.city}` : ''}` : undefined,
                  bookingUrl: `${window.location.origin}/book/${selectedBusiness.slug}`,
                },
              });
            }
          }
        } catch (welcomeErr) {
          console.error('Failed to send welcome email:', welcomeErr);
        }
      }

      return appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['class-mode-appointments'] });
      if (selectedCustomerPackageId) {
        queryClient.invalidateQueries({ queryKey: ['customer-packages'] });
      }
      toast.success('Class booked successfully!');
      setClassScheduleMode(false);
      setClassStep(2);
      setClassSelectedSlot(null);
      setClassSelectedDate(undefined);
      setSelectedService(null);
      setSelectedCustomerPackageId(null);
      setIsBooking(false);
      setActiveTab('appointments');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to book class');
    },
  });

  // Handle package purchase (optionally with applied coupon)
  const handlePackagePurchase = useMutation({
    mutationFn: async (args: { packageTemplate: PackageTemplate; appliedCoupon?: { couponId: string; discount: number; discountType: 'percentage' | 'fixed' } }) => {
      const { packageTemplate, appliedCoupon } = args;
      if (!user) throw new Error('User not found');

      // Get or create customer
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', packageTemplate.business_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) {
        // Create customer record if it doesn't exist
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: packageTemplate.business_id,
            user_id: user.id,
            name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email?.split('@')[0] || 'Customer' : user.email?.split('@')[0] || 'Customer',
            email: profile?.email || user.email || null,
            status: 'active',
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
      }

      // Calculate expiration
      const now = new Date();
      let expiresAt = new Date();
      const durationType = packageTemplate.duration_type;
      const durationValue = packageTemplate.duration_value;

      if (durationType === 'days') {
        expiresAt.setDate(now.getDate() + durationValue);
      } else if (durationType === 'weeks') {
        expiresAt.setDate(now.getDate() + (durationValue * 7));
      } else if (durationType === 'months') {
        expiresAt.setMonth(now.getMonth() + durationValue);
      } else if (durationType === 'years') {
        expiresAt.setFullYear(now.getFullYear() + durationValue);
      }

      // Create customer package
      const { data: customerPackage, error } = await supabase
        .from('customer_packages')
        .insert({
          customer_id: customer.id,
          package_template_id: packageTemplate.id,
          business_id: packageTemplate.business_id,
          expires_at: expiresAt.toISOString(),
          bookings_remaining: packageTemplate.booking_limit,
          bookings_used: 0,
          status: 'active',
        })
        .select('id')
        .single();

      if (error) throw error;

      if (appliedCoupon?.couponId && customer?.id && customerPackage?.id) {
        const basePrice = Number(packageTemplate.price);
        const discountAmount = appliedCoupon.discountType === 'percentage'
          ? (basePrice * appliedCoupon.discount / 100)
          : appliedCoupon.discount;
        try {
          await supabase.rpc('record_coupon_usage', {
            _coupon_id: appliedCoupon.couponId,
            _customer_id: customer.id,
            _user_id: user.id,
            _order_id: customerPackage.id,
            _discount_amount: discountAmount,
          });
        } catch (e) {
          console.error('Failed to record coupon usage:', e);
        }
      }
      return customerPackage;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-packages'] });
      setPackagePurchaseDialogOpen(false);
      setPackageToPurchase(null);
      setBuyPackageAppliedCoupon(null);
      setBuyPackageCouponCode('');
      setBuyPackageCouponError('');
      toast.success('Package purchased successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to purchase package');
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/customer-login');
  };

  // Must run before any early return (Rules of Hooks)
  const applicablePackagesForBooking = useMemo(() => {
    if (!selectedBusiness?.id || !selectedService?.id || !myPackages.length || !Array.isArray(packages)) return [];
    const now = new Date();
    return myPackages.filter((cp: any) => {
      if (cp.business_id !== selectedBusiness.id) return false;
      if (cp.status !== 'active') return false;
      const remaining = cp.bookings_remaining ?? 0;
      if (remaining <= 0) return false;
      try {
        if (cp.expires_at && new Date(cp.expires_at) < now) return false;
      } catch {
        return false;
      }
      const templateId = cp.package_template_id ?? cp.package_templates?.id;
      if (!templateId) return false;
      const template = packages.find((p: any) => p.id === templateId);
      const psList = template?.package_services;
      const serviceIds = Array.isArray(psList)
        ? psList.map((ps: any) => ps?.service_id).filter(Boolean)
        : [];
      return serviceIds.includes(selectedService.id);
    });
  }, [myPackages, packages, selectedBusiness?.id, selectedService?.id]);

  // Redirect unauthenticated users to customer login (they reach this page via a business's link)
  if (!authLoading && !user) {
    return <Navigate to="/customer-login" replace />;
  }

  // Show loading until auth and critical data are ready (hasMounted avoids first-paint crash after login)
  if (!hasMounted || authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const safeAppointments = Array.isArray(appointments) ? appointments : [];
  const safeBusinesses = Array.isArray(businesses) ? businesses : [];
  const safeServices = Array.isArray(services) ? services : [];
  const safePackages = Array.isArray(packages) ? packages : [];
  const upcomingAppointments = safeAppointments.filter(apt => 
    isFuture(new Date(apt.start_time)) || isToday(new Date(apt.start_time))
  );
  const pastAppointments = safeAppointments.filter(apt => 
    isPast(new Date(apt.start_time)) && !isToday(new Date(apt.start_time))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredServices = safeServices.filter(service => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return service.name.toLowerCase().includes(query) ||
           service.description?.toLowerCase().includes(query) ||
           service.category?.toLowerCase().includes(query);
  });

  const filteredPackages = safePackages.filter(pkg => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return pkg.name.toLowerCase().includes(query) ||
           pkg.description?.toLowerCase().includes(query);
  });

  // Group services by business
  const servicesByBusiness = filteredServices.reduce((acc, service) => {
    const business = safeBusinesses.find(b => b.id === service.business_id);
    if (!business) return acc;
    if (!acc[business.id]) {
      acc[business.id] = { business, services: [] };
    }
    acc[business.id].services.push(service);
    return acc;
  }, {} as Record<string, { business: Business; services: Service[] }>);

  // Group packages by business
  const packagesByBusiness = filteredPackages.reduce((acc, pkg) => {
    const business = safeBusinesses.find(b => b.id === pkg.business_id);
    if (!business) return acc;
    if (!acc[business.id]) {
      acc[business.id] = { business, packages: [] };
    }
    acc[business.id].packages.push(pkg);
    return acc;
  }, {} as Record<string, { business: Business; packages: PackageTemplate[] }>);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <CustomerDashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Header */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40 shrink-0">
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 sm:py-4 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="lg:hidden" />
                <span className="text-lg sm:text-xl font-display font-bold truncate">My Dashboard</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <ThemeToggle />
                <Button variant="ghost" onClick={handleSignOut} className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 scrollbar-thin min-w-0">
            <div className="container mx-auto max-w-6xl w-full min-w-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CustomerDashboardTab)} className="space-y-4 sm:space-y-6 w-full min-w-0 overflow-hidden">
                <TabsContent value="appointments" className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden mt-0">
        {safeAppointments.length === 0 ? (
          <Card className="glass-card text-center py-8 sm:py-12">
            <CardContent>
              <Calendar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground/50" />
              <h2 className="text-lg sm:text-xl font-semibold mb-2">No appointments yet</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                    Book your first appointment from the "Book Service" tab!
              </p>
                  <Button onClick={() => setActiveTab('services')} className="w-full sm:w-auto">
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {upcomingAppointments.length > 0 && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Upcoming Appointments
                </h2>
                <div className="space-y-3 sm:space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <Card key={apt.id} className="glass-card hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col gap-3 sm:gap-4">
                          <div className="space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-base sm:text-lg truncate">{apt.service?.name || 'Service'}</h3>
                              <Badge className={getStatusColor(apt.status)}>
                                {apt.status}
                              </Badge>
                              {apt.price && (
                                <span className="whitespace-nowrap text-lg sm:text-xl font-bold text-primary ml-auto">
                                  {formatCurrencySimple(Number(apt.price), apt.business?.currency || 'USD')}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                <span className="truncate">{format(new Date(apt.start_time), 'EEEE, MMMM d, yyyy')}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                {format(new Date(apt.start_time), 'h:mm a')}
                              </span>
                              {(apt as any).totalPeopleInSlot > 1 && (
                                <span className="flex items-center gap-1 text-primary">
                                  <Users className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                  {((apt as any).totalPeopleInSlot - 1)} {((apt as any).totalPeopleInSlot - 1) === 1 ? 'person' : 'people'} joining
                                </span>
                              )}
                            </div>
                            {apt.business && (
                              <p className="text-xs sm:text-sm flex items-center gap-1 text-muted-foreground truncate">
                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                                {apt.business.name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {(() => {
                              const deadlineHours = apt.business?.reschedule_deadline_hours ?? 24;
                              const now = new Date();
                              const hoursUntilAppointment = differenceInHours(new Date(apt.start_time), now);
                              const isDeadlinePassed = deadlineHours > 0 && hoursUntilAppointment < deadlineHours;
                              
                              return (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 sm:flex-initial"
                                  disabled={isDeadlinePassed}
                                  onClick={() => {
                                    if (isDeadlinePassed) {
                                      toast.error(
                                        `Reschedule requests must be made at least ${deadlineHours} hours before the appointment. The deadline has passed.`
                                      );
                                      return;
                                    }
                                    setSelectedAppointmentForReschedule({
                                      id: apt.id,
                                      start_time: apt.start_time,
                                      end_time: apt.end_time,
                                      business_id: apt.business_id,
                                      service_id: apt.service_id,
                                      location_id: apt.location_id ?? null,
                                      service: apt.service
                                        ? {
                                            name: apt.service.name,
                                            duration: apt.service.duration,
                                            buffer_time: apt.service.buffer_time,
                                            slot_capacity: apt.service.slot_capacity,
                                          }
                                        : null,
                                      businessDeadlineHours: apt.business?.reschedule_deadline_hours,
                                    });
                                    setRescheduleDialogOpen(true);
                                  }}
                                  title={isDeadlinePassed ? `Reschedule deadline has passed. Must request at least ${deadlineHours} hours before appointment.` : undefined}
                                >
                                  <CalendarClock className="h-4 w-4 mr-2" />
                                  Request Reschedule
                                </Button>
                              );
                            })()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pastAppointments.length > 0 && (
              <div>
                <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-muted-foreground">Past Appointments</h2>
                <div className="space-y-2 sm:space-y-3">
                  {pastAppointments.slice(0, 5).map((apt) => (
                    <Card key={apt.id} className="bg-muted/30">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">{apt.service?.name || 'Service'}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {format(new Date(apt.start_time), 'MMM d, yyyy')} at {format(new Date(apt.start_time), 'h:mm a')}
                            </p>
                          </div>
                          <Badge variant="outline" className="w-fit shrink-0">{apt.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
          </TabsContent>

          <TabsContent value="services" className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
            {safeBusinesses.length === 0 ? (
              <Card className="glass-card text-center py-8 sm:py-12">
                <CardContent>
                  <Briefcase className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground/50" />
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">No businesses linked</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                    Link to a business to see and book their services.
                  </p>
                  {!showBusinessSelector ? (
                    <Button onClick={() => setShowBusinessSelector(true)}>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Link to a Business
                    </Button>
                  ) : (
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search by business name or slug..."
                          className="pl-10"
                          value={businessSearchQuery}
                          onChange={(e) => setBusinessSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {searchableBusinesses.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {searchableBusinesses.map((business) => (
                            <Card
                              key={business.id}
                              className="cursor-pointer hover:border-primary/50 transition-all"
                              onClick={() => linkToBusiness.mutate(business.id)}
                            >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                                    <p className="font-semibold">{business.name}</p>
                                    <p className="text-sm text-muted-foreground">/{business.slug}</p>
                                  </div>
                                  {linkToBusiness.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Button size="sm">Link</Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                      {businessSearchQuery.length >= 2 && searchableBusinesses.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center">
                          No businesses found. Try a different search term.
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShowBusinessSelector(false);
                          setBusinessSearchQuery('');
                        }}
                      >
                        Cancel
                      </Button>
                          </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {!isBooking ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search services..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {Object.values(servicesByBusiness).map(({ business, services: businessServices }) => (
                      <div key={business.id} className="space-y-3 sm:space-y-4">
                        <h3 className="text-base sm:text-lg font-semibold">{business.name}</h3>
                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                          {business.use_class_schedule ? (
                            <Card
                              className="glass-card cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
                              onClick={() => {
                                setSelectedBusiness(business);
                                setSelectedLocation(null);
                                setClassScheduleMode(true);
                                setClassSelectedDate(startOfDay(new Date()));
                                setClassStep(2);
                                setClassSelectedSlot(null);
                                setClassFilterClass('');
                                setClassFilterInstructor('');
                                setClassFilterFacility('');
                                setSelectedCustomerPackageId(null);
                                setIsBooking(true);
                              }}
                            >
                              <CardHeader>
                                <div className="flex items-center gap-2">
                                  <CalendarClock className="h-5 w-5 text-primary" />
                                  <CardTitle className="text-base">View class schedule</CardTitle>
                                </div>
                                <CardDescription>Book a class from the weekly schedule</CardDescription>
                              </CardHeader>
                            </Card>
                          ) : businessServices.map((service) => (
                            <Card
                              key={service.id}
                              className="glass-card cursor-pointer hover:border-primary/50 transition-all overflow-hidden"
                              onClick={() => {
                                setSelectedBusiness(business);
                                setSelectedService(service);
                                setSelectedLocation(null);
                                setCouponCode('');
                                setAppliedCoupon(null);
                                setCouponError('');
                                setSelectedCustomerPackageId(null);
                                setIsBooking(true);
                              }}
                            >
                              <ImageSlideshow
                                imageUrls={(service as { image_urls?: string[] }).image_urls}
                                alt={service.name}
                                className="rounded-none"
                              />
                              <CardHeader>
                                <div className="flex justify-between items-start gap-2">
                                  <CardTitle className="text-base sm:text-lg truncate flex-1">{service.name}</CardTitle>
                                  <span className="text-base sm:text-lg font-bold text-primary shrink-0">
                                    {formatCurrencySimple(Number(service.price), business.currency || 'USD')}
                                  </span>
                                </div>
                                {service.category && (
                                  <Badge variant="outline" className="text-xs mt-2">
                                    {service.category}
                                  </Badge>
                                )}
                              </CardHeader>
                              <CardContent>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                    {service.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  <span>{service.duration} min</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}

                    {filteredServices.length === 0 && (
                      <Card className="glass-card text-center py-12">
                        <CardContent>
                          <p className="text-muted-foreground">No services found</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : classScheduleMode && selectedBusiness ? (
                  /* Class schedule flow: filters + 7-day strip + class list, or confirm step */
                  (() => {
                    const today = startOfDay(new Date());
                    const selectedDate = classSelectedDate || today;
                    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
                    const hasFilters = !!(classFilterClass || classFilterInstructor || classFilterFacility);
                    const uniqueClasses = Array.from(new Map(scheduledClasses.map((r) => [r.service_id, { id: r.service_id, name: r.service?.name ?? '' }])).values()).filter((c: { id: string; name: string }) => c.name);
                    const uniqueInstructors = Array.from(new Map(scheduledClasses.filter((r) => r.staff_id).map((r) => [r.staff_id!, { id: r.staff_id!, name: r.staff?.name ?? '' }])).values()).filter((c: { id: string; name: string }) => c.name);
                    const uniqueFacilities = Array.from(new Map(scheduledClasses.filter((r) => r.facility_id).map((r) => [r.facility_id!, { id: r.facility_id!, name: r.facility?.name ?? '' }])).values()).filter((c: { id: string; name: string }) => c.name);
                    const classModeLocations = locations;

                    return (
                      <div className="space-y-6 min-w-0 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <Button variant="ghost" onClick={() => {
                            setClassScheduleMode(false);
                            setClassStep(2);
                            setClassSelectedSlot(null);
                            setClassSelectedDate(undefined);
                            setSelectedBusiness(null);
                            setSelectedCustomerPackageId(null);
                            setIsBooking(false);
                          }} className="w-full sm:w-auto">
                            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                            Back
                          </Button>
                          <h2 className="text-lg sm:text-xl font-semibold truncate">{selectedBusiness.name} – Class schedule</h2>
                        </div>

                        {classStep === 2 && (
                          <>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 items-center">
                                <Select value={classFilterClass || '__all__'} onValueChange={(v) => setClassFilterClass(v === '__all__' ? '' : v)}>
                                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Class" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Class</SelectItem>
                                    {uniqueClasses.map((c: { id: string; name: string }) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={classFilterInstructor || '__all__'} onValueChange={(v) => setClassFilterInstructor(v === '__all__' ? '' : v)}>
                                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Instructor" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Instructor</SelectItem>
                                    {uniqueInstructors.map((c: { id: string; name: string }) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select value={classFilterFacility || '__all__'} onValueChange={(v) => setClassFilterFacility(v === '__all__' ? '' : v)}>
                                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Facility" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">Facility</SelectItem>
                                    {uniqueFacilities.map((c: { id: string; name: string }) => (
                                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {hasFilters && (
                                <Button variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => { setClassFilterClass(''); setClassFilterInstructor(''); setClassFilterFacility(''); }}>
                                  Clear all filters
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 min-w-0">
                              <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={() => setClassSelectedDate(addDays(selectedDate, -7))} aria-label="Previous week">
                                <ArrowRight className="h-4 w-4 rotate-180" />
                              </Button>
                              <div className="flex flex-1 gap-1 sm:gap-2 min-w-0 overflow-x-auto">
                                {weekDays.map((d) => {
                                  const isSelected = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                                  const isPast = isBefore(d, today);
                                  return (
                                    <button
                                      key={d.toISOString()}
                                      type="button"
                                      onClick={() => !isPast && setClassSelectedDate(d)}
                                      disabled={isPast}
                                      className={cn(
                                        'shrink-0 rounded-md border px-1.5 sm:px-2 py-1.5 sm:py-2 text-center text-xs sm:text-sm transition-colors min-w-[44px] sm:min-w-[52px]',
                                        isSelected && 'border-primary bg-primary/10 font-medium',
                                        !isSelected && !isPast && 'border-border hover:bg-muted',
                                        isPast && 'opacity-50 cursor-not-allowed'
                                      )}
                                    >
                                      <div className="font-medium truncate">{format(d, 'EEE')}</div>
                                      <div className="text-muted-foreground truncate">{format(d, 'd MMM')}</div>
                                    </button>
                                  );
                                })}
                              </div>
                              <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" onClick={() => setClassSelectedDate(addDays(selectedDate, 7))} aria-label="Next week">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </div>

                            {classModeLocations.length > 1 && (
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm text-muted-foreground">Location:</span>
                                {classModeLocations.map((loc: { id: string; name: string; address?: string | null }) => (
                                  <Button key={loc.id} variant={selectedLocation?.id === loc.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedLocation({ ...loc, address: loc.address ?? null })}>{loc.name}</Button>
                                ))}
                              </div>
                            )}

                            {(() => {
                              const dayOfWeek = selectedDate.getDay();
                              const dateStr = format(selectedDate, 'yyyy-MM-dd');
                              const forDay = scheduledClasses.filter((r) => r.day_of_week === dayOfWeek);
                              const byLocation = (selectedLocation && classModeLocations.length > 1)
                                ? forDay.filter((r) => r.location_id === selectedLocation.id)
                                : forDay;
                              const appointmentsList = classModeAppointments as { start_time: string; service_id: string; location_id?: string | null; staff_id?: string | null }[];
                              let withSpots = byLocation.map((row) => {
                                const capacity = (row.service as { slot_capacity?: number })?.slot_capacity ?? 1;
                                const timeStr = String(row.start_time).slice(0, 5);
                                const booked = appointmentsList.filter((a) => {
                                  const aptDate = format(new Date(a.start_time), 'yyyy-MM-dd');
                                  const aptTime = format(new Date(a.start_time), 'HH:mm');
                                  return aptDate === dateStr && aptTime === timeStr && a.service_id === row.service_id && (a.location_id ?? null) === (row.location_id ?? null) && (a.staff_id ?? null) === (row.staff_id ?? null);
                                }).length;
                                return { row, capacity, booked, spotsLeft: Math.max(0, capacity - booked) };
                              }).filter((x) => x.spotsLeft > 0);
                              if (classFilterClass) withSpots = withSpots.filter((x) => x.row.service_id === classFilterClass);
                              if (classFilterInstructor) withSpots = withSpots.filter((x) => x.row.staff_id === classFilterInstructor);
                              if (classFilterFacility) withSpots = withSpots.filter((x) => (x.row.facility_id ?? null) === classFilterFacility);
                              if (scheduledClassesLoading) {
                                return (
                                  <Card className="glass-card p-6 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                  </Card>
                                );
                              }
                              if (withSpots.length === 0) {
                                return (
                                  <Card className="glass-card p-6 text-center">
                                    <p className="text-muted-foreground">No classes with spots left on this day.</p>
                                  </Card>
                                );
                              }
                              return (
                                <div className="space-y-0 rounded-lg border divide-y divide-border overflow-hidden">
                                  {withSpots.map(({ row, spotsLeft }) => {
                                    const initials = (row.staff?.name ?? '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                                    const serviceForPackage = safeServices.find((s) => s.id === row.service_id);
                                    return (
                                      <div key={row.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-card hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <div className="shrink-0 space-y-0.5 text-sm">
                                            <div className="font-medium">{format(new Date(`2000-01-01T${row.start_time}`), 'h:mm a')}</div>
                                            <div className="text-muted-foreground">{row.service?.duration ?? 0} min</div>
                                          </div>
                                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                                            {initials}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-medium">{row.service?.name}</div>
                                            <div className="text-sm text-muted-foreground">{row.staff?.name ?? '—'}</div>
                                            <div className="text-xs text-muted-foreground">{row.facility?.name ?? '—'}</div>
                                          </div>
                                          <div className="text-sm text-muted-foreground shrink-0">{row.location?.name ?? '—'}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 sm:pl-4">
                                          <Badge variant="secondary">{spotsLeft} left</Badge>
                                          <Button size="sm" onClick={() => {
                                            setClassSelectedSlot(row);
                                            setSelectedService(serviceForPackage ?? null);
                                            setClassStep(3);
                                          }}>Book</Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </>
                        )}

                        {classStep === 3 && classSelectedSlot && selectedBusiness && (
                          <div className="space-y-6">
                            <h2 className="text-xl font-semibold">Confirm booking</h2>
                            <p className="text-sm text-muted-foreground">
                              {classSelectedSlot.service?.name} · {classSelectedDate && format(classSelectedDate, 'EEEE, MMM d')} at {format(new Date(`2000-01-01T${classSelectedSlot.start_time}`), 'h:mm a')}
                            </p>
                            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                              <Card className="glass-card">
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Contact Information
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <p className="text-sm text-muted-foreground">Booking as {profile?.first_name} {profile?.last_name} ({user?.email})</p>
                                </CardContent>
                              </Card>
                              <Card className="glass-card">
                                <CardHeader>
                                  <CardTitle className="text-lg">Booking Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Service</span>
                                      <span className="font-medium">{classSelectedSlot.service?.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Date & Time</span>
                                      <span className="font-medium">
                                        {classSelectedDate && format(classSelectedDate, 'MMM d, yyyy')} at {format(new Date(`2000-01-01T${classSelectedSlot.start_time}`), 'h:mm a')}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">Price</span>
                                      <span className="font-medium">
                                        {selectedCustomerPackageId
                                          ? (() => {
                                              const pkg = applicablePackagesForBooking.find((cp: any) => cp.id === selectedCustomerPackageId);
                                              return pkg ? <span className="text-primary">Using package: {pkg.package_templates?.name} (1 credit)</span> : formatCurrencySimple(0, selectedBusiness?.currency || 'USD');
                                            })()
                                          : formatCurrencySimple(Number(selectedService?.price ?? 0), selectedBusiness?.currency || 'USD')}
                                      </span>
                                    </div>
                                  </div>
                                  {Array.isArray(applicablePackagesForBooking) && applicablePackagesForBooking.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t">
                                      <Label className="text-sm">Use a package?</Label>
                                      <div className="flex flex-col gap-2">
                                        <Button type="button" variant={selectedCustomerPackageId === null ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setSelectedCustomerPackageId(null)}>
                                          Pay full price
                                        </Button>
                                        {applicablePackagesForBooking.map((cp: any) => (
                                          <Button key={cp.id} type="button" variant={selectedCustomerPackageId === cp.id ? 'default' : 'outline'} size="sm" className="justify-start" onClick={() => setSelectedCustomerPackageId(cp.id)}>
                                            <Package className="h-4 w-4 mr-2 shrink-0" />
                                            {cp.package_templates?.name ?? 'Package'} ({(cp.bookings_remaining ?? 0)} credit{(cp.bookings_remaining ?? 0) !== 1 ? 's' : ''} left)
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </div>
                            <div className="flex justify-between gap-3">
                              <Button variant="outline" onClick={() => { setClassStep(2); setClassSelectedSlot(null); setSelectedService(null); }}>
                                Back
                              </Button>
                              <Button
                                disabled={handleClassBooking.isPending}
                                onClick={() => handleClassBooking.mutate()}
                              >
                                {handleClassBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                Confirm booking
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <Button variant="ghost" onClick={() => {
                        setIsBooking(false);
                        setSelectedService(null);
                        setSelectedBusiness(null);
                        setSelectedStaff(null);
                        setSelectedLocation(null);
                        setSelectedDate(undefined);
                        setSelectedTime(null);
                        setCouponCode('');
                        setAppliedCoupon(null);
                        setCouponError('');
                        setSelectedCustomerPackageId(null);
                      }} className="w-full sm:w-auto">
                        <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                        Back
                      </Button>
                      <h2 className="text-lg sm:text-xl font-semibold truncate">Book {selectedService?.name}</h2>
          </div>

                    <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>Select Date</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CalendarComponent
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              setSelectedTime(null);
                            }}
                            disabled={(date) => {
                              if (isBefore(date, startOfDay(new Date())) || isAfter(date, addDays(new Date(), 30))) {
                                return true;
                              }
                              const dayOfWeek = date.getDay();
                              let dayH = selectedLocation
                                ? businessHours.find((h: any) => h.day_of_week === dayOfWeek && h.location_id === selectedLocation?.id)
                                : null;
                              if (!dayH) {
                                dayH = businessHours.find((h: any) => h.day_of_week === dayOfWeek && h.location_id === null);
                              }
                              if (dayH?.is_closed) return true;
                              const dateStr = format(date, 'yyyy-MM-dd');
                              return offDays.includes(dateStr);
                            }}
                          />
                        </CardContent>
                      </Card>

                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>Select Time</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {!selectedDate ? (
                            <p className="text-muted-foreground text-center py-8">
                              Please select a date first
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                                {generateTimeSlots().map((slot) => (
                                  <Button
                                    key={slot.time}
                                    variant={selectedTime === slot.time ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedTime(slot.time)}
                                    className="flex flex-col items-center justify-center h-auto py-2"
                                  >
                                    <span className="font-medium">
                                      {format(new Date(`2000-01-01T${slot.time}`), 'h:mm a')}
                                    </span>
                                    <span className="text-xs opacity-75 mt-0.5">
                                      {slot.available} {slot.available === 1 ? 'slot' : 'slots'} available
                                    </span>
                                  </Button>
                                ))}
                                {generateTimeSlots().length === 0 && (
                                  <p className="col-span-2 text-muted-foreground text-center py-4">
                                    No available times for this date
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {locations.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>Select Location {locations.length > 1 ? '(Optional)' : ''}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {locations.length > 1 && (
                              <Button
                                variant={selectedLocation === null ? 'default' : 'outline'}
                                onClick={() => setSelectedLocation(null)}
                              >
                                No Preference
                              </Button>
                            )}
                            {locations.map((loc: { id: string; name: string; address: string | null }) => (
                              <Button
                                key={loc.id}
                                variant={selectedLocation?.id === loc.id ? 'default' : 'outline'}
                                onClick={() => setSelectedLocation(loc)}
                                className="justify-start"
                              >
                                <MapPin className="h-4 w-4 mr-2 shrink-0" />
                                {loc.name}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {staff.length > 0 && (
                      <Card className="glass-card">
                        <CardHeader>
                          <CardTitle>Select Staff (Optional)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <Button
                              variant={selectedStaff === null ? 'default' : 'outline'}
                              onClick={() => setSelectedStaff(null)}
                            >
                              No Preference
                            </Button>
                            {staff.map((member) => (
                              <Button
                                key={member.id}
                                variant={selectedStaff?.id === member.id ? 'default' : 'outline'}
                                onClick={() => setSelectedStaff(member)}
                              >
                                {member.name}
                              </Button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle>Booking Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service</span>
                            <span className="font-medium">{selectedService?.name}</span>
                          </div>
                          {selectedDate && selectedTime && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Date & Time</span>
                                <span className="font-medium">
                                  {format(selectedDate, 'MMM d, yyyy')} at {format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Price</span>
                                <span className="font-medium">
                                  {selectedCustomerPackageId
                                    ? (() => {
                                        const pkg = applicablePackagesForBooking.find((cp: any) => cp.id === selectedCustomerPackageId);
                                        return pkg ? (
                                          <span className="text-primary">Using package: {pkg.package_templates?.name} (1 credit)</span>
                                        ) : formatCurrencySimple(0, selectedBusiness?.currency || 'USD');
                                      })()
                                    : (() => {
                                        const basePrice = Number(selectedService?.price ?? 0);
                                        let finalPrice = basePrice;
                                        if (appliedCoupon) {
                                          if (appliedCoupon.discountType === 'percentage') {
                                            finalPrice = basePrice - (basePrice * appliedCoupon.discount / 100);
                                          } else {
                                            finalPrice = Math.max(0, basePrice - appliedCoupon.discount);
                                          }
                                        }
                                        return formatCurrencySimple(finalPrice, selectedBusiness?.currency || 'USD');
                                      })()}
                                </span>
                              </div>
                              {appliedCoupon && !selectedCustomerPackageId && (
                                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                  <span>Discount ({appliedCoupon.code})</span>
                                  <span>
                                    -{appliedCoupon.discountType === 'percentage'
                                      ? `${appliedCoupon.discount}%`
                                      : formatCurrencySimple(appliedCoupon.discount, selectedBusiness?.currency || 'USD')}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {Array.isArray(applicablePackagesForBooking) && applicablePackagesForBooking.length > 0 && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label className="text-sm">Use a package?</Label>
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                variant={selectedCustomerPackageId === null ? 'default' : 'outline'}
                                size="sm"
                                className="justify-start"
                                onClick={() => setSelectedCustomerPackageId(null)}
                              >
                                Pay full price
                              </Button>
                              {applicablePackagesForBooking.map((cp: any) => (
                                <Button
                                  key={cp.id}
                                  type="button"
                                  variant={selectedCustomerPackageId === cp.id ? 'default' : 'outline'}
                                  size="sm"
                                  className="justify-start"
                                  onClick={() => {
                                    setSelectedCustomerPackageId(cp.id);
                                    setAppliedCoupon(null);
                                    setCouponCode('');
                                    setCouponError('');
                                    setIsRecurring(false);
                                  }}
                                >
                                  <Package className="h-4 w-4 mr-2 shrink-0" />
                                  {cp.package_templates?.name ?? 'Package'} ({(cp.bookings_remaining ?? 0)} credit{(cp.bookings_remaining ?? 0) !== 1 ? 's' : ''} left)
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {!selectedCustomerPackageId && (
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-sm">Have a coupon code?</Label>
                          {appliedCoupon ? (
                            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                Coupon {appliedCoupon.code} applied
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAppliedCoupon(null);
                                  setCouponCode('');
                                  setCouponError('');
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Enter coupon code"
                                value={couponCode}
                                onChange={(e) => {
                                  setCouponCode(e.target.value.toUpperCase());
                                  setCouponError('');
                                }}
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={async () => {
                                  if (!couponCode.trim() || !selectedService || !selectedBusiness) return;
                                  setIsApplyingCoupon(true);
                                  setCouponError('');
                                  try {
                                    const { data, error } = await supabase.rpc('validate_coupon', {
                                      _coupon_code: couponCode.trim(),
                                      _business_id: selectedBusiness.id,
                                      _purchase_amount: Number(selectedService.price),
                                      _service_id: selectedService.id,
                                      _package_template_id: null,
                                    });
                                    if (error) throw error;
                                    if (data && data.length > 0 && (data[0].valid === true || data[0].is_valid === true)) {
                                      const result = data[0];
                                      const cData = result.coupon_data || {};
                                      const isPct = (cData.discount_type ?? cData.discountType) === 'percentage';
                                      setAppliedCoupon({
                                        code: couponCode.trim(),
                                        couponId: cData.id || '',
                                        discount: isPct ? Number(cData.discount_value ?? cData.discountValue ?? 0) : Number(result.discount_amount ?? result.discountAmount ?? 0),
                                        discountType: isPct ? 'percentage' : 'fixed',
                                      });
                                      setCouponError('');
                                      toast.success('Coupon applied!');
                                    } else {
                                      setCouponError(data?.[0]?.message || 'Invalid coupon code');
                                    }
                                  } catch (err: any) {
                                    setCouponError(err.message || 'Failed to apply coupon');
                                    toast.error(err.message || 'Failed to apply coupon');
                                  } finally {
                                    setIsApplyingCoupon(false);
                                  }
                                }}
                                disabled={isApplyingCoupon || !couponCode.trim()}
                              >
                                {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                              </Button>
                            </div>
                          )}
                          {couponError && <p className="text-xs text-red-600 dark:text-red-400">{couponError}</p>}
                        </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle>Notes (Optional)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="Any special requests..."
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          rows={3}
                        />
                      </CardContent>
                    </Card>

                    {/* Recurring Appointment Options - not available when using a package (1 credit = 1 booking) */}
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle>Recurring Appointment</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Make this recurring</span>
                          </div>
                          <Switch
                            checked={isRecurring}
                            onCheckedChange={setIsRecurring}
                            disabled={!!selectedCustomerPackageId}
                          />
                        </div>
                        
                        {isRecurring && (
                          <Collapsible open={isRecurring} className="space-y-4">
                            <CollapsibleContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm">Pattern</Label>
                                  <Select
                                    value={recurrencePattern}
                                    onValueChange={(value: 'weekly' | 'monthly') => setRecurrencePattern(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm">
                                    Every {recurrencePattern === 'weekly' ? 'Week(s)' : 'Month(s)'}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={recurrenceFrequency}
                                    onChange={(e) => setRecurrenceFrequency(parseInt(e.target.value) || 1)}
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-sm">End Date</Label>
                                <Select
                                  value={recurrenceEndType}
                                  onValueChange={(value: 'never' | 'date' | 'occurrences') => setRecurrenceEndType(value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="never">Never</SelectItem>
                                    <SelectItem value="date">On Date</SelectItem>
                                    <SelectItem value="occurrences">After Occurrences</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {recurrenceEndType === 'date' && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        'w-full justify-start text-left font-normal',
                                        !recurrenceEndDate && 'text-muted-foreground'
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {recurrenceEndDate ? (
                                        format(recurrenceEndDate, 'PPP')
                                      ) : (
                                        <span>Pick an end date</span>
                                      )}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={recurrenceEndDate || undefined}
                                      onSelect={(date) => setRecurrenceEndDate(date || null)}
                                      disabled={(date) => date < (selectedDate || new Date())}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              )}
                              
                              {recurrenceEndType === 'occurrences' && (
                                <div className="space-y-2">
                                  <Label className="text-sm">Number of Occurrences</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={recurrenceMaxOccurrences || ''}
                                    onChange={(e) => setRecurrenceMaxOccurrences(parseInt(e.target.value) || null)}
                                    placeholder="e.g., 10"
                                  />
                                </div>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                      <Button variant="outline" onClick={() => setIsBooking(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleBooking.mutate()}
                        disabled={!selectedDate || !selectedTime || handleBooking.isPending}
                      >
                        {handleBooking.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {isRecurring ? 'Creating Series...' : 'Booking...'}
                          </>
                        ) : (
                          <>
                            {isRecurring ? 'Create Recurring Series' : 'Confirm Booking'}
                            <CheckCircle className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="packages" className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
            {safeBusinesses.length === 0 ? (
              <Card className="glass-card text-center py-12">
                <CardContent>
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold mb-2">No businesses linked</h2>
                  <p className="text-muted-foreground mb-6">
                    Link to a business to see and purchase their packages.
                  </p>
                  {!showBusinessSelector ? (
                    <Button onClick={() => setShowBusinessSelector(true)}>
                      <Briefcase className="h-4 w-4 mr-2" />
                      Link to a Business
                    </Button>
                  ) : (
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search by business name or slug..."
                          className="pl-10"
                          value={businessSearchQuery}
                          onChange={(e) => setBusinessSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      {searchableBusinesses.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {searchableBusinesses.map((business) => (
                            <Card
                              key={business.id}
                              className="cursor-pointer hover:border-primary/50 transition-all"
                              onClick={() => linkToBusiness.mutate(business.id)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold">{business.name}</p>
                                    <p className="text-sm text-muted-foreground">/{business.slug}</p>
                                  </div>
                                  {linkToBusiness.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Button size="sm">Link</Button>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                      {businessSearchQuery.length >= 2 && searchableBusinesses.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center">
                          No businesses found. Try a different search term.
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShowBusinessSelector(false);
                          setBusinessSearchQuery('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search packages..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {Object.values(packagesByBusiness).map(({ business, packages: businessPackages }) => (
                  <div key={business.id} className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">{business.name}</h3>
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {businessPackages.map((pkg) => (
                        <Card key={pkg.id} className="glass-card overflow-hidden">
                          <ImageSlideshow
                            imageUrls={(pkg as { image_urls?: string[] }).image_urls}
                            alt={pkg.name}
                            className="rounded-none"
                          />
                          <CardHeader>
                            <CardTitle>{pkg.name}</CardTitle>
                            {pkg.description && (
                              <CardDescription className="line-clamp-2">
                                {pkg.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-primary">
                                {formatCurrencySimple(Number(pkg.price), business.currency || 'USD')}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{pkg.booking_limit} bookings</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  {pkg.duration_value} {pkg.duration_type}
                                </span>
                              </div>
                              {pkg.services && pkg.services.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Includes:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {pkg.services.slice(0, 3).map((service) => (
                                      <Badge key={service.id} variant="outline" className="text-xs">
                                        {service.name}
                                      </Badge>
                                    ))}
                                    {pkg.services.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{pkg.services.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              className="w-full"
                              onClick={() => {
                                setPackageToPurchase(pkg);
                                setBuyPackageCouponCode('');
                                setBuyPackageAppliedCoupon(null);
                                setBuyPackageCouponError('');
                                setPackagePurchaseDialogOpen(true);
                              }}
                              disabled={handlePackagePurchase.isPending}
                            >
                              <ShoppingBag className="mr-2 h-4 w-4" />
                              Purchase Package
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredPackages.length === 0 && (
                  <Card className="glass-card text-center py-12">
                    <CardContent>
                      <p className="text-muted-foreground">No packages available</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="my-packages" className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
            {myPackages.length === 0 ? (
              <Card className="glass-card text-center py-12">
                <CardContent>
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold mb-2">No packages purchased</h2>
                  <p className="text-muted-foreground mb-6">
                    Purchase packages from the "Buy Package" tab to see them here.
                  </p>
                  <Button onClick={() => setActiveTab('packages')}>
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Browse Packages
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myPackages.map((pkg: any) => {
                  const isExpired = new Date(pkg.expires_at) < new Date();
                  const isUsed = pkg.bookings_remaining === 0;
                  
                  return (
                    <Card key={pkg.id} className="glass-card">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>{pkg.package_templates?.name || 'Package'}</CardTitle>
                          <Badge
                            variant={isExpired ? 'destructive' : isUsed ? 'secondary' : 'default'}
                          >
                            {isExpired ? 'Expired' : isUsed ? 'Used' : 'Active'}
                          </Badge>
                        </div>
                        {pkg.package_templates?.description && (
                          <CardDescription>{pkg.package_templates.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bookings Remaining</span>
                            <span className="font-semibold">{pkg.bookings_remaining}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Bookings Used</span>
                            <span className="font-semibold">{pkg.bookings_used}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Expires</span>
                            <span className="font-semibold">
                              {format(new Date(pkg.expires_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-4 sm:space-y-6 min-w-0 overflow-hidden">
            {profileLoading || authLoading ? (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </CardContent>
              </Card>
            ) : !user ? (
              <Card className="glass-card">
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">Please log in to view your profile</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card overflow-hidden min-w-0 max-w-full">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Profile Settings</CardTitle>
                  <CardDescription className="text-sm">
                    Update your personal information and account settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
                  {/* Profile Picture */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 min-w-0">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shrink-0">
                      <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                      <AvatarFallback>
                        {profile?.first_name?.[0] || profile?.last_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Change Photo
                          </>
                        )}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              await uploadAvatar(file);
                            } catch (error) {
                              console.error('Error uploading avatar:', error);
                            }
                          }
                        }}
                      />
                      <p className="text-sm text-muted-foreground">
                        JPG, PNG or GIF. Max size 2MB
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName || profile?.first_name || ''}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName || profile?.last_name || ''}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Enter your last name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email || profile?.email || user?.email || ''}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone || profile?.phone || ''}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={async () => {
                        setIsSavingProfile(true);
                        try {
                          await updateProfile({
                            first_name: firstName || profile?.first_name,
                            last_name: lastName || profile?.last_name,
                            phone: phone || profile?.phone,
                          });
                          // Update email in auth if changed
                          if (email && email !== user?.email) {
                            const { error } = await supabase.auth.updateUser({ email });
                            if (error) throw error;
                          }
                          toast.success('Profile updated successfully!');
                          setFirstName('');
                          setLastName('');
                          setEmail('');
                          setPhone('');
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to update profile');
                        } finally {
                          setIsSavingProfile(false);
                        }
                      }}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>

                  <Separator />

                  {/* Change Password */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">Change Password</h3>
                    <div className="space-y-3 sm:space-y-4 w-full max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={async () => {
                          if (!newPassword || !confirmPassword) {
                            toast.error('Please fill in all password fields');
                            return;
                          }
                          if (newPassword !== confirmPassword) {
                            toast.error('New passwords do not match');
                            return;
                          }
                          if (newPassword.length < 6) {
                            toast.error('Password must be at least 6 characters');
                            return;
                          }
                          setIsChangingPassword(true);
                          try {
                            const { error } = await supabase.auth.updateUser({
                              password: newPassword,
                            });
                            if (error) throw error;
                            toast.success('Password updated successfully!');
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                          } catch (error: any) {
                            toast.error(error.message || 'Failed to update password');
                          } finally {
                            setIsChangingPassword(false);
                          }
                        }}
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
              </Tabs>
            </div>
          </main>

          {selectedAppointmentForReschedule && (
            <RescheduleRequestDialog
              open={rescheduleDialogOpen}
              onOpenChange={setRescheduleDialogOpen}
              appointment={selectedAppointmentForReschedule}
              rescheduleDeadlineHours={selectedAppointmentForReschedule.businessDeadlineHours}
            />
          )}

          <Dialog open={packagePurchaseDialogOpen} onOpenChange={(open) => { setPackagePurchaseDialogOpen(open); if (!open) { setPackageToPurchase(null); setBuyPackageCouponCode(''); setBuyPackageAppliedCoupon(null); setBuyPackageCouponError(''); } }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm package purchase</DialogTitle>
              </DialogHeader>
              {packageToPurchase && (
                <div className="space-y-4">
                  <div>
                    <p className="font-medium">{packageToPurchase.name}</p>
                    <p className="text-sm text-muted-foreground">{packageToPurchase.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Coupon code"
                      value={buyPackageCouponCode}
                      onChange={(e) => { setBuyPackageCouponCode(e.target.value); setBuyPackageCouponError(''); }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        if (!buyPackageCouponCode.trim() || !packageToPurchase) return;
                        setIsApplyingBuyPackageCoupon(true);
                        setBuyPackageCouponError('');
                        try {
                          const { data, error } = await supabase.rpc('validate_coupon', {
                            _coupon_code: buyPackageCouponCode.trim(),
                            _business_id: packageToPurchase.business_id,
                            _purchase_amount: Number(packageToPurchase.price),
                            _service_id: null,
                            _package_template_id: packageToPurchase.id,
                          });
                          if (error) throw error;
                          if (data && data.length > 0 && (data[0].valid === true || data[0].is_valid === true)) {
                            const result = data[0];
                            const cData = result.coupon_data || {};
                            const isPct = (cData.discount_type ?? cData.discountType) === 'percentage';
                            setBuyPackageAppliedCoupon({
                              code: buyPackageCouponCode.trim(),
                              couponId: cData.id || '',
                              discount: isPct ? Number(cData.discount_value ?? cData.discountValue ?? 0) : Number(result.discount_amount ?? result.discountAmount ?? 0),
                              discountType: isPct ? 'percentage' : 'fixed',
                            });
                            setBuyPackageCouponError('');
                            toast.success('Coupon applied!');
                          } else {
                            setBuyPackageAppliedCoupon(null);
                            setBuyPackageCouponError(data?.[0]?.message || 'Invalid coupon code');
                          }
                        } catch (err: any) {
                          setBuyPackageAppliedCoupon(null);
                          setBuyPackageCouponError(err.message || 'Failed to apply coupon');
                          toast.error(err.message || 'Failed to apply coupon');
                        } finally {
                          setIsApplyingBuyPackageCoupon(false);
                        }
                      }}
                      disabled={isApplyingBuyPackageCoupon || !buyPackageCouponCode.trim()}
                    >
                      {isApplyingBuyPackageCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                  {buyPackageCouponError && <p className="text-sm text-red-600 dark:text-red-400">{buyPackageCouponError}</p>}
                  {buyPackageAppliedCoupon && <p className="text-sm text-green-600 dark:text-green-400">Coupon &quot;{buyPackageAppliedCoupon.code}&quot; applied.</p>}
                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Price</span>
                      <span>{Number(packageToPurchase.price).toFixed(2)}</span>
                    </div>
                    {buyPackageAppliedCoupon ? (() => {
                      const base = Number(packageToPurchase.price);
                      const discountAmount = buyPackageAppliedCoupon.discountType === 'percentage'
                        ? (base * buyPackageAppliedCoupon.discount / 100)
                        : buyPackageAppliedCoupon.discount;
                      const total = Math.max(0, base - discountAmount);
                      return (
                        <>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Discount</span>
                            <span>-{discountAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-1">
                            <span>Total</span>
                            <span>{total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })() : (
                      <div className="flex justify-between font-medium pt-1">
                        <span>Total</span>
                        <span>{Number(packageToPurchase.price).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPackagePurchaseDialogOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    if (!packageToPurchase) return;
                    handlePackagePurchase.mutate({
                      packageTemplate: packageToPurchase,
                      appliedCoupon: buyPackageAppliedCoupon ?? undefined,
                    });
                  }}
                  disabled={handlePackagePurchase.isPending || !packageToPurchase}
                >
                  {handlePackagePurchase.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                  Confirm Purchase
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
