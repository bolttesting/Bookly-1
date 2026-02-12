import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings,
  Eye,
  EyeOff,
  Camera,
  CalendarClock,
  Repeat,
  CalendarIcon
} from 'lucide-react';
import { format, isPast, isFuture, isToday, addMinutes, setHours, setMinutes, startOfDay, isBefore, isAfter, addDays, differenceInHours } from 'date-fns';
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
import { RescheduleRequestDialog } from '@/components/appointments/RescheduleRequestDialog';

interface Business {
  id: string;
  name: string;
  slug: string;
  currency: string | null;
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
  const [activeTab, setActiveTab] = useState('appointments');
  const [searchQuery, setSearchQuery] = useState('');
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointmentForReschedule, setSelectedAppointmentForReschedule] = useState<{
    id: string;
    start_time: string;
    end_time: string;
    service?: { name: string; duration: number } | null;
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [businessSearchQuery, setBusinessSearchQuery] = useState('');
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'weekly' | 'monthly'>('weekly');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [recurrenceMaxOccurrences, setRecurrenceMaxOccurrences] = useState<number | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'occurrences'>('never');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Get businesses customer is associated with
  const { data: businesses = [], refetch: refetchBusinesses } = useQuery({
    queryKey: ['customer-businesses', user?.id],
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
        .select('id, name, slug, currency')
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
        .select('id, name, slug, currency')
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
          business_id
        `)
        .in('customer_id', customerIds)
        .order('start_time', { ascending: true });

      if (error) throw error;

      const serviceIds = [...new Set(data.map(a => a.service_id))];
      const staffIds = [...new Set(data.map(a => a.staff_id).filter(Boolean))];
      const businessIds = [...new Set(data.map(a => a.business_id))];

      const [servicesRes, staffRes, businessesRes] = await Promise.all([
        supabase.from('services').select('id, name, duration').in('id', serviceIds),
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

  // Get business hours
  const { data: businessHours = [] } = useQuery({
    queryKey: ['business-hours', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];

      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', selectedBusiness.id)
        .order('day_of_week');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id,
  });

  // Get off days
  const { data: offDaysData = [] } = useQuery({
    queryKey: ['off-days', selectedBusiness?.id],
    queryFn: async () => {
      if (!selectedBusiness?.id) return [];

      const { data, error } = await supabase
        .from('off_days')
        .select('off_date')
        .eq('business_id', selectedBusiness.id)
        .is('location_id', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBusiness?.id,
  });

  const offDays = offDaysData.map(d => d.off_date);

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
    const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek && !h.is_closed);
    
    if (!dayHours || dayHours.is_closed) return [];

    const openTime = dayHours.open_time || '09:00';
    const closeTime = dayHours.close_time || '18:00';
    const slotInterval = selectedService.duration + (selectedService.buffer_time || 0);
    const capacity = selectedService.slot_capacity || 1;

    const [openHours, openMinutes] = openTime.split(':').map(Number);
    const [closeHours, closeMinutes] = closeTime.split(':').map(Number);

    let current = setMinutes(setHours(startOfDay(selectedDate), openHours), openMinutes);
    const end = setMinutes(setHours(startOfDay(selectedDate), closeHours), closeMinutes);
    const now = new Date();

    const slots: SlotAvailability[] = [];
    while (isBefore(current, end)) {
      const appointmentEnd = addMinutes(current, selectedService.duration);
      if (isAfter(appointmentEnd, end)) break;

      if (!isBefore(current, now)) {
        const timeStr = format(current, 'HH:mm');
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

    return slots;
  };

  // Handle booking
  const handleBooking = useMutation({
    mutationFn: async () => {
      if (!selectedBusiness || !selectedService || !selectedDate || !selectedTime || !user) {
        throw new Error('Please fill in all required fields');
      }

      // Get or create customer
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
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
          .select('id')
          .single();

        if (customerError) throw customerError;
        customer = newCustomer;
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
            recurrence_pattern: recurrencePattern,
            recurrence_frequency: recurrenceFrequency,
            start_date: format(selectedDate, 'yyyy-MM-dd'),
            end_date: recurrenceEndType === 'date' && recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : null,
            max_occurrences: recurrenceEndType === 'occurrences' ? recurrenceMaxOccurrences : null,
            time_of_day: selectedTime,
            notes: bookingNotes || null,
            price: Number(selectedService.price),
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

        return { id: newSeries.id, isRecurring: true };
      }

      // Create single appointment
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
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          price: Number(selectedService.price),
          status: 'pending',
          notes: bookingNotes || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      return appointment;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments-availability'] });
      if (result?.isRecurring) {
        toast.success('Recurring appointment series created successfully!');
      } else {
        toast.success('Appointment booked successfully!');
      }
      setSelectedService(null);
      setSelectedStaff(null);
      setSelectedDate(undefined);
      setSelectedTime(null);
      setBookingNotes('');
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

  // Handle package purchase
  const handlePackagePurchase = useMutation({
    mutationFn: async (packageTemplate: PackageTemplate) => {
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
      return customerPackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-packages'] });
      toast.success('Package purchased successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to purchase package');
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(apt => 
    isFuture(new Date(apt.start_time)) || isToday(new Date(apt.start_time))
  );
  const pastAppointments = appointments.filter(apt => 
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

  const filteredServices = services.filter(service => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return service.name.toLowerCase().includes(query) ||
           service.description?.toLowerCase().includes(query) ||
           service.category?.toLowerCase().includes(query);
  });

  const filteredPackages = packages.filter(pkg => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return pkg.name.toLowerCase().includes(query) ||
           pkg.description?.toLowerCase().includes(query);
  });

  // Group services by business
  const servicesByBusiness = filteredServices.reduce((acc, service) => {
    const business = businesses.find(b => b.id === service.business_id);
    if (!business) return acc;
    if (!acc[business.id]) {
      acc[business.id] = { business, services: [] };
    }
    acc[business.id].services.push(service);
    return acc;
  }, {} as Record<string, { business: Business; services: Service[] }>);

  // Group packages by business
  const packagesByBusiness = filteredPackages.reduce((acc, pkg) => {
    const business = businesses.find(b => b.id === pkg.business_id);
    if (!business) return acc;
    if (!acc[business.id]) {
      acc[business.id] = { business, packages: [] };
    }
    acc[business.id].packages.push(pkg);
    return acc;
  }, {} as Record<string, { business: Business; packages: PackageTemplate[] }>);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold">My Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          <Button variant="ghost" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="inline-flex w-full min-w-max gap-1 sm:gap-2 text-xs sm:text-sm">
              <TabsTrigger value="appointments" className="whitespace-nowrap px-3 sm:px-4 shrink-0">
                <span className="hidden sm:inline">Appointments</span>
                <span className="sm:hidden">Apts</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="whitespace-nowrap px-3 sm:px-4 shrink-0">
                <span className="hidden sm:inline">Book Service</span>
                <span className="sm:hidden">Book</span>
              </TabsTrigger>
              <TabsTrigger value="packages" className="whitespace-nowrap px-3 sm:px-4 shrink-0">
                <span className="hidden sm:inline">Buy Package</span>
                <span className="sm:hidden">Buy</span>
              </TabsTrigger>
              <TabsTrigger value="my-packages" className="whitespace-nowrap px-3 sm:px-4 shrink-0">
                <span className="hidden sm:inline">My Packages</span>
                <span className="sm:hidden">My Pkg</span>
              </TabsTrigger>
              <TabsTrigger value="profile" className="whitespace-nowrap px-3 sm:px-4 shrink-0">Profile</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="appointments" className="space-y-4 sm:space-y-6">
        {appointments.length === 0 ? (
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
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                            <div className="space-y-2 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-base sm:text-lg truncate">{apt.service?.name || 'Service'}</h3>
                              <Badge className={getStatusColor(apt.status)}>
                                {apt.status}
                              </Badge>
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
                          {apt.price && (
                              <div className="text-left sm:text-right shrink-0">
                                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">{formatCurrencySimple(Number(apt.price), apt.business?.currency || 'USD')}</p>
                            </div>
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
                                      service: apt.service ? { name: apt.service.name, duration: apt.service.duration } : null,
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

          <TabsContent value="services" className="space-y-4 sm:space-y-6">
            {businesses.length === 0 ? (
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
                          {businessServices.map((service) => (
                            <Card
                              key={service.id}
                              className="glass-card cursor-pointer hover:border-primary/50 transition-all"
                              onClick={() => {
                                setSelectedBusiness(business);
                                setSelectedService(service);
                                setIsBooking(true);
                              }}
                            >
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
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <Button variant="ghost" onClick={() => {
                        setIsBooking(false);
                        setSelectedService(null);
                        setSelectedBusiness(null);
                        setSelectedStaff(null);
                        setSelectedDate(undefined);
                        setSelectedTime(null);
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
                              // Check if date is closed by business hours
                              const dayOfWeek = date.getDay();
                              const dayHours = businessHours.find(h => h.day_of_week === dayOfWeek);
                              if (dayHours?.is_closed) return true;
                              // Check if date is an off day
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

                    {/* Recurring Appointment Options */}
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

          <TabsContent value="packages" className="space-y-6">
            {businesses.length === 0 ? (
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
                        <Card key={pkg.id} className="glass-card">
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
                              onClick={() => handlePackagePurchase.mutate(pkg)}
                              disabled={handlePackagePurchase.isPending}
                            >
                              {handlePackagePurchase.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="mr-2 h-4 w-4" />
                                  Purchase Package
                                </>
                              )}
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

          <TabsContent value="my-packages" className="space-y-6">
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

          <TabsContent value="profile" className="space-y-6">
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
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>
                    Update your personal information and account settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
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
      </main>

        {selectedAppointmentForReschedule && (
          <RescheduleRequestDialog
            open={rescheduleDialogOpen}
            onOpenChange={setRescheduleDialogOpen}
            appointment={selectedAppointmentForReschedule}
            rescheduleDeadlineHours={selectedAppointmentForReschedule.businessDeadlineHours}
          />
        )}
    </div>
  );
}
