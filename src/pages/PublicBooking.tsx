import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { format, addMinutes, setHours, setMinutes, startOfDay, isBefore, isAfter, addDays } from 'date-fns';
import { Calendar, Clock, User, Mail, Phone, ArrowRight, ArrowLeft, CheckCircle, Loader2, Users, LogIn, MapPin, Eye, EyeOff, Tag, Repeat, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { formatCurrencySimple, getCurrencyByCode } from '@/lib/currency';
import { PaymentForm } from '@/components/payment/PaymentForm';
import { useAppointmentReminders } from '@/hooks/useReminders';
import { notifyBusinessUsers } from '@/lib/notifications';
import { cn } from '@/lib/utils';

interface Business {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  currency: string | null;
  require_payment?: boolean;
  stripe_connected?: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  category: string | null;
  buffer_time: number;
  slot_capacity: number;
}

interface StaffMember {
  id: string;
  name: string;
  role: string | null;
  avatar_url: string | null;
}

interface BusinessHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
  location_id: string | null;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  is_primary: boolean;
}

interface SlotAvailability {
  time: string;
  booked: number;
  capacity: number;
  available: number;
}

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email'),
  phone: z.string().trim().optional(),
  notes: z.string().trim().max(500).optional(),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isEmbedded = searchParams.get('embed') === 'true';
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [appointments, setAppointments] = useState<{ start_time: string; service_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'weekly' | 'monthly'>('weekly');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [recurrenceMaxOccurrences, setRecurrenceMaxOccurrences] = useState<number | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'occurrences'>('never');
  const [step, setStep] = useState(1);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [createdCustomerId, setCreatedCustomerId] = useState<string | null>(null);
  const { createReminders } = useAppointmentReminders();

  // Auth state
  const [authMode, setAuthMode] = useState<'guest' | 'login' | 'signup'>('guest');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<{ id: string; email: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Booking state
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; discountType: 'percentage' | 'fixed' } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Check for logged in user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setLoggedInUser({ id: session.user.id, email: session.user.email || '' });
        setCustomerEmail(session.user.email || '');
        // Try to get customer name from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile) {
          setCustomerName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        }
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!slug) return;

      try {
        // Fetch business
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (businessError) throw businessError;
        if (!businessData) {
          setLoading(false);
          return;
        }

        setBusiness(businessData);

        // Fetch services
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', businessData.id)
          .eq('status', 'active')
          .order('name');

        // Fetch active service cancellations
        const today = format(new Date(), 'yyyy-MM-dd');
        const { data: cancellationsData } = await supabase
          .from('service_cancellations')
          .select('service_id, cancelled_date')
          .eq('business_id', businessData.id)
          .lte('cancelled_date', today);

        const cancelledServiceIds = new Set(
          (cancellationsData || []).map(c => c.service_id)
        );

        // Filter out cancelled services
        const activeServices = (servicesData || []).filter(
          service => !cancelledServiceIds.has(service.id)
        );

        setServices(activeServices);

        // Fetch staff
        const { data: staffData } = await supabase
          .from('staff_members')
          .select('*')
          .eq('business_id', businessData.id)
          .eq('status', 'available')
          .order('name');

        setStaff(staffData || []);

        // Fetch locations
        const { data: locationsData } = await supabase
          .from('business_locations')
          .select('*')
          .eq('business_id', businessData.id)
          .eq('status', 'active')
          .order('is_primary', { ascending: false })
          .order('name');

        setLocations(locationsData || []);
        
        // Auto-select if only one location or primary location
        if (locationsData && locationsData.length === 1) {
          setSelectedLocation(locationsData[0]);
        } else if (locationsData && locationsData.length > 0) {
          const primary = locationsData.find(l => l.is_primary);
          if (primary) setSelectedLocation(primary);
        }

        // Fetch business hours
        const { data: hoursData } = await supabase
          .from('business_hours')
          .select('*')
          .eq('business_id', businessData.id)
          .order('day_of_week');

        setBusinessHours(hoursData || []);

        // Fetch appointments for the next 30 days
        const { data: appointmentsData } = await supabase
          .from('appointments')
          .select('start_time, service_id')
          .eq('business_id', businessData.id)
          .gte('start_time', new Date().toISOString())
          .lte('start_time', addDays(new Date(), 30).toISOString())
          .in('status', ['confirmed', 'pending']);

        setAppointments(appointmentsData || []);
      } catch (error) {
        console.error('Error fetching business:', error);
        toast.error('Failed to load booking page');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [slug]);

  const generateTimeSlotsWithAvailability = (): SlotAvailability[] => {
    if (!selectedDate || !selectedService) return [];

    const dayOfWeek = selectedDate.getDay();
    
    // First try to find location-specific hours, then fall back to default business hours
    let dayHours = selectedLocation 
      ? businessHours.find(h => h.day_of_week === dayOfWeek && h.location_id === selectedLocation.id)
      : null;
    
    // If no location-specific hours, use default business hours (location_id is null)
    if (!dayHours) {
      dayHours = businessHours.find(h => h.day_of_week === dayOfWeek && h.location_id === null);
    }
    
    // If no custom hours set, use defaults (9 AM - 6 PM)
    const openTime = dayHours?.open_time || '09:00';
    const closeTime = dayHours?.close_time || '18:00';
    const isClosed = dayHours?.is_closed ?? false;

    if (isClosed) return [];

    const slots: SlotAvailability[] = [];
    const [openHours, openMinutes] = openTime.split(':').map(Number);
    const [closeHours, closeMinutes] = closeTime.split(':').map(Number);
    
    // Calculate slot interval: duration + buffer time
    const slotInterval = selectedService.duration + (selectedService.buffer_time || 0);
    const capacity = selectedService.slot_capacity || 1;

    let current = setMinutes(setHours(startOfDay(selectedDate), openHours), openMinutes);
    const end = setMinutes(setHours(startOfDay(selectedDate), closeHours), closeMinutes);
    const now = new Date();

    while (isBefore(current, end)) {
      // Check if the appointment would fit before closing time
      const appointmentEnd = addMinutes(current, selectedService.duration);
      if (isAfter(appointmentEnd, end)) break;
      
      // Don't show past times for today
      if (!isBefore(current, now)) {
        const timeStr = format(current, 'HH:mm');
        
        // Count how many appointments are booked for this time slot and service
        const booked = appointments.filter(apt => {
          const aptDate = new Date(apt.start_time);
          return format(aptDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') &&
                 format(aptDate, 'HH:mm') === timeStr &&
                 apt.service_id === selectedService.id;
        }).length;

        const available = capacity - booked;
        
        slots.push({
          time: timeStr,
          booked,
          capacity,
          available: Math.max(0, available)
        });
      }
      current = addMinutes(current, slotInterval);
    }

    return slots;
  };

  // State for off days
  const [offDays, setOffDays] = useState<string[]>([]);

  // Fetch off days
  useEffect(() => {
    const fetchOffDays = async () => {
      if (!business?.id) return;

      const locationId = selectedLocation?.id || null;
      let query = supabase
        .from('off_days')
        .select('off_date')
        .eq('business_id', business.id);

      if (locationId) {
        query = query.or(`location_id.eq.${locationId},location_id.is.null`);
      } else {
        query = query.is('location_id', null);
      }

      const { data } = await query;
      if (data) {
        setOffDays(data.map(d => d.off_date));
      }
    };

    fetchOffDays();
  }, [business?.id, selectedLocation?.id]);

  // Check if a date is closed
  const isDateClosed = (date: Date) => {
    const dayOfWeek = date.getDay();
    
    // First try to find location-specific hours
    let dayHours = selectedLocation 
      ? businessHours.find(h => h.day_of_week === dayOfWeek && h.location_id === selectedLocation.id)
      : null;
    
    // If no location-specific hours, use default business hours
    if (!dayHours) {
      dayHours = businessHours.find(h => h.day_of_week === dayOfWeek && h.location_id === null);
    }
    
    // Check if day is closed by business hours
    if (dayHours?.is_closed) return true;
    
    // Check if date is an off day
    const dateStr = format(date, 'yyyy-MM-dd');
    return offDays.includes(dateStr);
  };

  const handleLogin = async () => {
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.user) {
        setLoggedInUser({ id: data.user.id, email: data.user.email || '' });
        setCustomerEmail(data.user.email || '');
        
        // Get profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (profile) {
          setCustomerName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim());
        }
        
        toast.success('Logged in successfully!');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignup = async () => {
    const validation = signupSchema.safeParse({ 
      name: customerName, 
      email: customerEmail, 
      password: signupPassword 
    });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsAuthLoading(true);
    try {
      // Split name into first/last
      const nameParts = customerName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data, error } = await supabase.auth.signUp({
        email: customerEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.href,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        setLoggedInUser({ id: data.user.id, email: data.user.email || '' });
        toast.success('Account created! Proceeding with booking...');
        
        // Auto-submit the booking after signup
        setTimeout(() => {
          handleSubmit();
        }, 500);
      }
    } catch (error: any) {
      if (error.message?.includes('already registered')) {
        toast.error('Email already registered. Please login instead.');
        setAuthMode('login');
        setLoginEmail(customerEmail);
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSubmit = async () => {
    console.log('🚀 BOOKING SUBMITTED - Starting booking process');
    console.log('Form state:', {
      business: !!business,
      selectedService: !!selectedService,
      selectedDate: !!selectedDate,
      selectedTime: !!selectedTime,
      customerName,
      customerEmail,
    });
    
    if (!business || !selectedService || !selectedDate || !selectedTime) {
      console.error('❌ Missing required fields:', {
        business: !business,
        selectedService: !selectedService,
        selectedDate: !selectedDate,
        selectedTime: !selectedTime,
      });
      return;
    }

    const validation = customerSchema.safeParse({
      name: customerName,
      email: customerEmail,
      phone: customerPhone || undefined,
      notes: customerNotes || undefined,
    });

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors);
      toast.error(validation.error.errors[0].message);
      return;
    }

    console.log('✅ Validation passed, starting booking...');
    setSubmitting(true);
    try {
      // Create or find customer
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, user_id')
        .eq('business_id', business.id)
        .eq('email', customerEmail)
        .maybeSingle();

      let customerId: string;

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Link user_id if customer exists but doesn't have user_id and we have logged in user
        if (!existingCustomer.user_id && loggedInUser) {
          const { error: updateError } = await supabase
            .from('customers')
            .update({ user_id: loggedInUser.id, name: customerName })
            .eq('id', existingCustomer.id);
          
          if (updateError) {
            console.error('Error updating customer:', updateError);
            // Don't fail booking if update fails, just log it
          }
        }
      } else {
        // Log auth state for debugging
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Auth state:', {
          hasSession: !!session,
          userId: session?.user?.id,
          loggedInUser: loggedInUser?.id,
          businessId: business.id,
        });

        const customerData = {
            business_id: business.id,
            name: customerName,
            email: customerEmail,
            phone: customerPhone || null,
            notes: customerNotes || null,
            user_id: loggedInUser?.id || null,
        };
        
        console.log('Attempting to create customer with data:', customerData);

        // Try direct insert first
        let newCustomer;
        let customerError;
        
        const insertResult = await supabase
          .from('customers')
          .insert(customerData)
          .select('id')
          .single();

        newCustomer = insertResult.data;
        customerError = insertResult.error;

        console.log('Customer insert result:', {
          success: !!newCustomer,
          customerId: newCustomer?.id,
          error: customerError ? {
            code: customerError.code,
            message: customerError.message,
            details: customerError.details,
            hint: customerError.hint,
          } : null,
        });

        // If direct insert fails with RLS error, try using RPC function as fallback
        if (customerError && (customerError.code === '42501' || customerError.message?.includes('row-level security'))) {
          console.log('Direct insert failed with RLS error, trying RPC function...');
          
          const rpcResult = await supabase.rpc('create_customer_for_booking', {
            p_business_id: business.id,
            p_name: customerName,
            p_email: customerEmail,
            p_phone: customerPhone || null,
            p_notes: customerNotes || null,
            p_user_id: loggedInUser?.id || null,
          });

          console.log('RPC function result:', {
            success: !rpcResult.error,
            data: rpcResult.data,
            error: rpcResult.error ? {
              code: rpcResult.error.code,
              message: rpcResult.error.message,
              details: rpcResult.error.details,
            } : null,
          });

          if (rpcResult.error) {
            console.error('RPC function also failed:', rpcResult.error);
            customerError = rpcResult.error;
          } else {
            // RPC succeeded
            customerId = rpcResult.data;
            newCustomer = { id: rpcResult.data };
            customerError = null;
            console.log('✅ Customer created via RPC, ID:', customerId);
          }
        }

        if (customerError) {
          console.error('❌ Customer creation error details:', {
            message: customerError.message,
            details: customerError.details,
            hint: customerError.hint,
            code: customerError.code,
            fullError: JSON.stringify(customerError, null, 2),
          });
          throw customerError;
        }
        
        if (newCustomer?.id) {
        customerId = newCustomer.id;
          console.log('✅ Customer created successfully, ID:', customerId);
          
          // Create notification for business owners/admins about new customer
          try {
            await notifyBusinessUsers(business.id, {
              title: 'New Customer Registered',
              message: `New customer ${customerName} has registered and booked an appointment`,
              type: 'user',
              link: '/customers',
            });
          } catch (notifError) {
            console.error('Failed to create customer notification:', notifError);
            // Don't fail booking if notification fails
          }
        } else {
          console.error('❌ Customer creation succeeded but no ID returned!', newCustomer);
          throw new Error('Customer creation failed: No ID returned');
        }
      }

      console.log('✅ Customer ID obtained:', customerId);
      console.log('Customer ID is valid:', !!customerId && customerId !== 'undefined' && customerId !== 'null');

      if (!customerId) {
        console.error('❌ Customer ID is missing! Cannot create appointment.');
        throw new Error('Failed to create or find customer');
      }

      // Create appointment
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = setMinutes(setHours(selectedDate, hours), minutes);
      const endTime = addMinutes(startTime, selectedService.duration);

      console.log('📅 Appointment timing:', {
        selectedDate: selectedDate.toISOString(),
        selectedTime,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: selectedService.duration,
      });

      // Calculate final price with coupon discount
      const servicePrice = Number(selectedService.price) || 0;
      let finalPrice = servicePrice;
      
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
          finalPrice = servicePrice - (servicePrice * appliedCoupon.discount / 100);
        } else {
          finalPrice = Math.max(0, servicePrice - appliedCoupon.discount);
        }
      }
      
      // Check payment requirements based on payment timing
      const hasStripe = business.stripe_connected;
      const paymentTiming = business.payment_timing || 'advance';
      const requiresPayment = business.require_payment && hasStripe && finalPrice > 0;
      
      console.log('=== BOOKING DEBUG ===');
      console.log('Payment check:', {
        require_payment: business.require_payment,
        stripe_connected: hasStripe,
        servicePrice,
        paymentTiming,
        requiresPayment,
      });
      
      // Determine payment status based on timing
      let paymentStatus: 'pending' | 'paid' | 'partial' = 'paid';
      let requiresAdvancePayment = false;
      let advanceAmount = 0;

      if (requiresPayment) {
        if (paymentTiming === 'advance') {
          paymentStatus = 'pending';
          requiresAdvancePayment = true;
          advanceAmount = finalPrice;
        } else if (paymentTiming === 'on_spot') {
          paymentStatus = 'pending'; // Will be paid on-the-spot
          requiresAdvancePayment = false;
        } else if (paymentTiming === 'partial') {
          const partialPercentage = business.partial_payment_percentage || 50;
          advanceAmount = (finalPrice * partialPercentage) / 100;
          paymentStatus = 'partial';
          requiresAdvancePayment = true;
        }
      }
      
      console.log('Payment decision:', {
        paymentStatus,
        requiresAdvancePayment,
        advanceAmount,
        willShowPayment: requiresAdvancePayment,
      });

      // If recurring, create a series instead of a single appointment
      if (isRecurring) {
        console.log('📅 Creating recurring appointment series...');
        try {
          // Create recurring series directly
          const { data: newSeries, error: seriesError } = await supabase
            .from('recurring_appointment_series')
            .insert({
              business_id: business.id,
              customer_id: customerId,
              service_id: selectedService.id,
              staff_id: selectedStaff?.id || null,
              location_id: selectedLocation?.id || null,
              recurrence_pattern: recurrencePattern,
              recurrence_frequency: recurrenceFrequency,
              start_date: format(selectedDate, 'yyyy-MM-dd'),
              end_date: recurrenceEndType === 'date' && recurrenceEndDate ? format(recurrenceEndDate, 'yyyy-MM-dd') : null,
              max_occurrences: recurrenceEndType === 'occurrences' ? recurrenceMaxOccurrences : null,
              time_of_day: selectedTime,
              notes: customerNotes || null,
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
            toast.warning('Series created but some appointments could not be generated. Please check availability.');
          }
          
          toast.success('Recurring appointment series created successfully!');
          setBookingComplete(true);
          setSubmitting(false);
          return;
        } catch (seriesError: any) {
          console.error('❌ Recurring series creation error:', seriesError);
          toast.error(seriesError.message || 'Failed to create recurring series');
          setSubmitting(false);
          return;
        }
      }

      const appointmentData = {
          business_id: business.id,
          customer_id: customerId,
          service_id: selectedService.id,
          staff_id: selectedStaff?.id || null,
          location_id: selectedLocation?.id || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          price: finalPrice,
          status: 'pending',
          payment_status: paymentStatus,
          notes: customerNotes || null,
      };
      
      console.log('📝 Attempting to create appointment with data:', appointmentData);
      console.log('Customer ID:', customerId);
      console.log('Customer ID type:', typeof customerId);
      console.log('Customer ID value:', customerId);

      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select('id')
        .single();

      if (appointmentError) {
        console.error('❌ Appointment creation error:', appointmentError);
        console.error('Error code:', appointmentError.code);
        console.error('Error message:', appointmentError.message);
        console.error('Error details:', appointmentError.details);
        console.error('Error hint:', appointmentError.hint);
        console.error('Full error object:', JSON.stringify(appointmentError, null, 2));
        throw appointmentError;
      }

      console.log('✅ Appointment created successfully:', appointment.id);

      if (requiresAdvancePayment) {
        console.log('💰 Payment required - showing payment screen');
        // Store appointment and customer IDs for payment
        setCreatedAppointmentId(appointment.id);
        setCreatedCustomerId(customerId);
        setShowPayment(true);
        return; // Don't complete booking yet, wait for payment
      }

      console.log('📧 No payment required - proceeding to send email');

      // Check if this is customer's first booking and send welcome email
      try {
        const { data: previousAppointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('customer_id', customerId)
          .eq('business_id', business.id)
          .neq('id', appointment.id)
          .limit(1);

        const isFirstBooking = !previousAppointments || previousAppointments.length === 0;

        if (isFirstBooking) {
          // Check if welcome email is enabled
          const { data: emailSettings } = await supabase
            .from('reminder_settings')
            .select('send_welcome_email')
            .eq('business_id', business.id)
            .maybeSingle();

          if (emailSettings?.send_welcome_email === true) {
            try {
              await supabase.functions.invoke('send-welcome-email', {
                body: {
                  customerEmail,
                  customerName,
                  businessName: business.name,
                  businessPhone: business.phone,
                  businessAddress: business.address ? `${business.address}${business.city ? `, ${business.city}` : ''}` : null,
                  bookingUrl: `${window.location.origin}/book/${business.slug}`,
                },
              });
              console.log('✅ Welcome email sent to new customer');
            } catch (welcomeEmailError) {
              console.error('Failed to send welcome email:', welcomeEmailError);
              // Don't fail the booking if welcome email fails
            }
          }
        }
      } catch (welcomeCheckError) {
        console.error('Failed to check for welcome email:', welcomeCheckError);
        // Don't fail the booking if welcome check fails
      }

      // Create appointment reminders
      try {
        await createReminders.mutateAsync(appointment.id);
      } catch (reminderError) {
        console.error('Failed to create reminders:', reminderError);
        // Don't fail the booking if reminders fail
      }

      // Send confirmation email (if enabled)
      try {
        // Check if booking confirmation emails are enabled
        const { data: emailSettings } = await supabase
          .from('reminder_settings')
          .select('send_booking_confirmation')
          .eq('business_id', business.id)
          .maybeSingle();

        const shouldSendEmail = emailSettings?.send_booking_confirmation !== false; // Default to true if not set

        if (!shouldSendEmail) {
          console.log('📧 Booking confirmation email is disabled in settings');
          // Don't send email, but continue with booking
        } else {
          console.log('=== EMAIL DEBUG START ===');
          console.log('Attempting to send confirmation email to:', customerEmail);
          console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
          console.log('Function payload:', {
            appointmentId: appointment.id,
            customerEmail,
            customerName,
            serviceName: selectedService.name,
            businessName: business.name,
            startTime: startTime.toISOString(),
            staffName: selectedStaff?.name,
          });
          
          const emailResult = await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            appointmentId: appointment.id,
            customerEmail,
            customerName,
            serviceName: selectedService.name,
            businessName: business.name,
            startTime: startTime.toISOString(),
            staffName: selectedStaff?.name,
          },
        });
          
          console.log('=== EMAIL FUNCTION RESULT ===');
          console.log('Full result:', emailResult);
          console.log('Data:', emailResult.data);
          console.log('Error:', emailResult.error);
          console.log('Error details:', emailResult.error ? {
            message: emailResult.error.message,
            status: emailResult.error.status,
            context: emailResult.error.context,
            fullError: emailResult.error,
          } : 'No error');
          
          if (emailResult.error) {
            console.error('❌ Email function error:', emailResult.error);
            toast.error(`Email failed: ${emailResult.error.message || 'Unknown error'}`);
          } else {
            console.log('✅ Email function success:', emailResult.data);
            if (emailResult.data?.success) {
              console.log('✅ Email sent successfully!');
            } else {
              console.warn('⚠️ Function returned but success is false:', emailResult.data);
            }
          }
          console.log('=== EMAIL DEBUG END ===');
        }
      } catch (emailError: any) {
        console.error('=== EMAIL EXCEPTION ===');
        console.error('Exception type:', emailError?.constructor?.name);
        console.error('Exception message:', emailError?.message);
        console.error('Exception stack:', emailError?.stack);
        console.error('Full exception:', emailError);
        toast.error(`Email exception: ${emailError?.message || 'Unknown error'}`);
        // Don't fail the booking if email fails
      }

      // Create notification for business owners/admins about new booking
      try {
        const appointmentDate = new Date(startTime);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const formattedTime = appointmentDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        await notifyBusinessUsers(business.id, {
          title: 'New Appointment Booked',
          message: `${customerName} booked ${selectedService.name} on ${formattedDate} at ${formattedTime}`,
          type: 'appointment',
          link: '/calendar',
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
        // Don't fail the booking if notification fails
      }

      setBookingComplete(true);
      toast.success('Appointment booked successfully!');
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      // Show more detailed error message
      const errorMessage = error?.message || error?.error?.message || 'Failed to book appointment. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-card max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Business Not Found</CardTitle>
            <CardDescription>
              The booking page you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle payment success
  const handlePaymentSuccess = async (paymentId: string) => {
    if (!createdAppointmentId) return;

    try {
      // Create appointment reminders
      try {
        await createReminders.mutateAsync(createdAppointmentId);
      } catch (reminderError) {
        console.error('Failed to create reminders:', reminderError);
      }

      // Send confirmation email
      try {
        console.log('=== EMAIL DEBUG START (PAYMENT SUCCESS) ===');
        console.log('Attempting to send confirmation email to:', customerEmail);
        console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
        console.log('Function payload:', {
          appointmentId: createdAppointmentId,
          customerEmail,
          customerName,
          serviceName: selectedService?.name || '',
          businessName: business?.name || '',
          startTime: selectedDate && selectedTime 
            ? setMinutes(setHours(selectedDate, parseInt(selectedTime.split(':')[0])), parseInt(selectedTime.split(':')[1])).toISOString()
            : new Date().toISOString(),
          staffName: selectedStaff?.name,
        });
        
        const emailResult = await supabase.functions.invoke('send-booking-confirmation', {
          body: {
            appointmentId: createdAppointmentId,
            customerEmail,
            customerName,
            serviceName: selectedService?.name || '',
            businessName: business?.name || '',
            startTime: selectedDate && selectedTime 
              ? setMinutes(setHours(selectedDate, parseInt(selectedTime.split(':')[0])), parseInt(selectedTime.split(':')[1])).toISOString()
              : new Date().toISOString(),
            staffName: selectedStaff?.name,
          },
        });
        
        console.log('=== EMAIL FUNCTION RESULT (PAYMENT SUCCESS) ===');
        console.log('Full result:', emailResult);
        console.log('Data:', emailResult.data);
        console.log('Error:', emailResult.error);
        
        if (emailResult.error) {
          console.error('❌ Email function error:', emailResult.error);
          toast.error(`Email failed: ${emailResult.error.message || 'Unknown error'}`);
        } else {
          console.log('✅ Email function success:', emailResult.data);
          if (emailResult.data?.success) {
            console.log('✅ Email sent successfully!');
          }
        }
        console.log('=== EMAIL DEBUG END (PAYMENT SUCCESS) ===');
      } catch (emailError: any) {
        console.error('=== EMAIL EXCEPTION (PAYMENT SUCCESS) ===');
        console.error('Exception:', emailError);
        toast.error(`Email exception: ${emailError?.message || 'Unknown error'}`);
      }

      setShowPayment(false);
      setBookingComplete(true);
      toast.success('Payment successful! Appointment booked.');
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error('Payment successful but failed to complete booking. Please contact support.');
    }
  };

  const handlePaymentCancel = () => {
    // Cancel appointment if payment is cancelled
    if (createdAppointmentId) {
      supabase
        .from('appointments')
        .delete()
        .eq('id', createdAppointmentId)
        .then(() => {
          setShowPayment(false);
          setCreatedAppointmentId(null);
          setCreatedCustomerId(null);
          toast.info('Booking cancelled. You can try again.');
        });
    }
  };

  if (showPayment && createdAppointmentId && business && selectedService) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-display font-bold mb-2">
              Complete Your Booking
            </h1>
            <p className="text-muted-foreground">
              Please complete payment to confirm your appointment
            </p>
          </div>
          
          <PaymentForm
            businessId={business.id}
            appointmentId={createdAppointmentId}
            amount={(() => {
              const basePrice = Number(selectedService.price);
              let finalPrice = basePrice;
              if (appliedCoupon) {
                if (appliedCoupon.discountType === 'percentage') {
                  finalPrice = basePrice - (basePrice * appliedCoupon.discount / 100);
                } else {
                  finalPrice = Math.max(0, basePrice - appliedCoupon.discount);
                }
              }
              return finalPrice;
            })()}
            currency={business.currency || 'USD'}
            customerEmail={customerEmail}
            customerName={customerName}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
          />

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {selectedDate && format(selectedDate, 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">
                  {selectedTime && format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="glass-card max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">Booking Confirmed!</CardTitle>
            <CardDescription>
              Your appointment has been scheduled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{selectedTime && format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">${selectedService?.price}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              A confirmation email has been sent to {customerEmail}
            </p>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => {
                setBookingComplete(false);
                setStep(1);
                setSelectedService(null);
                setSelectedStaff(null);
                setSelectedDate(undefined);
                setSelectedTime(null);
                setCustomerName('');
                setCustomerEmail('');
                setCustomerPhone('');
                setCustomerNotes('');
              }}
            >
              Book Another Appointment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isEmbedded ? 'p-2' : ''}`}>
      {/* Header - hidden in embed mode */}
      {!isEmbedded && (
        <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg">{business.name}</h1>
                <p className="text-xs text-muted-foreground">{business.industry}</p>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={`container mx-auto px-4 sm:px-6 ${isEmbedded ? 'py-4' : 'py-6 sm:py-8'} max-w-4xl`}>
        {/* Progress Steps - Dynamic based on whether locations exist */}
        {(() => {
          const hasMultipleLocations = locations.length > 1;
          const totalSteps = hasMultipleLocations ? 5 : 4;
          const adjustedStep = hasMultipleLocations ? step : (step > 1 ? step - 1 : step);
          
          return (
            <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step >= s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {s}
                  </div>
                  {s < totalSteps && (
                    <div
                      className={`w-6 sm:w-12 h-1 mx-0.5 sm:mx-1 rounded ${
                        step > s ? 'bg-primary' : 'bg-secondary'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Step 1: Select Location (only if multiple locations) */}
        {step === 1 && locations.length > 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-display font-bold">Select a Location</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Choose which location you'd like to visit</p>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {locations.map((location) => (
                <Card
                  key={location.id}
                  className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                    selectedLocation?.id === location.id ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedLocation(location)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{location.name}</CardTitle>
                      </div>
                      {location.is_primary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Primary</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-1">
                    {location.address && <p>{location.address}</p>}
                    {location.city && <p>{location.city}</p>}
                    {location.phone && <p>{location.phone}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                disabled={!selectedLocation}
                onClick={() => setStep(2)}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Select Service (Step 1 if no locations, Step 2 if locations) */}
        {((locations.length <= 1 && step === 1) || (locations.length > 1 && step === 2)) && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-display font-bold">Select a Service</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Choose the service you'd like to book</p>
            </div>

            {services.length === 0 ? (
              <Card className="glass-card p-6 sm:p-8 text-center">
                <p className="text-sm sm:text-base text-muted-foreground">No services available at this time.</p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                      selectedService?.id === service.id ? 'border-primary ring-2 ring-primary/20' : ''
                    }`}
                    onClick={() => setSelectedService(service)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrencySimple(Number(service.price), business?.currency || 'USD')}
                        </span>
                      </div>
                      {service.category && (
                        <span className="text-xs text-muted-foreground">{service.category}</span>
                      )}
                    </CardHeader>
                    <CardContent>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{service.duration} minutes</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              {locations.length > 1 && (
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              {locations.length <= 1 && <div />}
              <Button
                disabled={!selectedService}
                onClick={() => setStep(locations.length > 1 ? 3 : 2)}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Select Staff (Step 2 if no locations, Step 3 if locations) */}
        {((locations.length <= 1 && step === 2) || (locations.length > 1 && step === 3)) && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-display font-bold">Select a Staff Member</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Choose who you'd like to see (optional)</p>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card
                className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                  selectedStaff === null ? 'border-primary ring-2 ring-primary/20' : ''
                }`}
                onClick={() => setSelectedStaff(null)}
              >
                <CardContent className="p-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-2">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium">No Preference</p>
                  <p className="text-xs text-muted-foreground">Any available staff</p>
                </CardContent>
              </Card>

              {staff.map((member) => (
                <Card
                  key={member.id}
                  className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                    selectedStaff?.id === member.id ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedStaff(member)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium">{member.name}</p>
                    {member.role && (
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(locations.length > 1 ? 2 : 1)} className="flex-1 sm:flex-initial">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(locations.length > 1 ? 4 : 3)} className="flex-1 sm:flex-initial">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Select Date & Time (Step 3 if no locations, Step 4 if locations) */}
        {((locations.length <= 1 && step === 3) || (locations.length > 1 && step === 4)) && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-display font-bold">Select Date & Time</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">Choose when you'd like to come in</p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Select Date</CardTitle>
                </CardHeader>
                <CardContent>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setSelectedTime(null);
                    }}
                    disabled={(date) => 
                      isBefore(date, startOfDay(new Date())) || 
                      isAfter(date, addDays(new Date(), 30)) ||
                      isDateClosed(date)
                    }
                    className="rounded-md"
                  />
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Select Time</CardTitle>
                  {selectedService && selectedService.slot_capacity > 1 && (
                    <CardDescription className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Up to {selectedService.slot_capacity} spots per slot
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {!selectedDate ? (
                    <p className="text-muted-foreground text-center py-8">
                      Please select a date first
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {generateTimeSlotsWithAvailability().map((slot) => (
                        <Button
                          key={slot.time}
                          variant={selectedTime === slot.time ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={slot.available === 0}
                          className="flex flex-col h-auto py-2 px-3"
                        >
                          <span>{format(new Date(`2000-01-01T${slot.time}`), 'h:mm a')}</span>
                          {slot.capacity > 1 && (
                            <Badge 
                              variant={slot.available === 0 ? 'destructive' : slot.available <= 2 ? 'secondary' : 'outline'}
                              className="text-[10px] mt-1"
                            >
                              {slot.available === 0 ? 'Full' : `${slot.available}/${slot.capacity} left`}
                            </Badge>
                          )}
                          {slot.capacity === 1 && slot.available === 0 && (
                            <Badge variant="destructive" className="text-[10px] mt-1">
                              Booked
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {generateTimeSlotsWithAvailability().length === 0 && selectedDate && (
                        <p className="col-span-2 text-muted-foreground text-center py-4">
                          {isDateClosed(selectedDate) 
                            ? 'We are closed on this day' 
                            : 'No available times for this date'}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(locations.length > 1 ? 3 : 2)} className="flex-1 sm:flex-initial">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(locations.length > 1 ? 5 : 4)}
                className="flex-1 sm:flex-initial"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Customer Details (Step 4 if no locations, Step 5 if locations) */}
        {((locations.length <= 1 && step === 4) || (locations.length > 1 && step === 5)) && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-display font-bold">Your Details</h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {loggedInUser ? `Logged in as ${loggedInUser.email}` : 'Please provide your contact information'}
              </p>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {loggedInUser ? 'Your Information' : 'Contact Information'}
                  </CardTitle>
                  {!loggedInUser && (
                    <CardDescription>
                      <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'guest' | 'login' | 'signup')}>
                        <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
                          <TabsTrigger value="guest">Guest</TabsTrigger>
                          <TabsTrigger value="login">Login</TabsTrigger>
                          <TabsTrigger value="signup">Sign Up</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Guest Mode */}
                  {authMode === 'guest' && !loggedInUser && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder="John Doe"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Login Mode */}
                  {authMode === 'login' && !loggedInUser && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="john@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                      </div>
                      <Button 
                        type="button" 
                        className="w-full" 
                        onClick={handleLogin}
                        disabled={isAuthLoading}
                      >
                        {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                        Sign In
                      </Button>
                    </>
                  )}

                  {/* Signup Mode */}
                  {authMode === 'signup' && !loggedInUser && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            placeholder="John Doe"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="john@example.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                        <Input
                          id="signup-password"
                            type={showSignupPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                          >
                            {showSignupPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        className="w-full" 
                        onClick={handleSignup}
                        disabled={isAuthLoading}
                      >
                        {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <User className="h-4 w-4 mr-2" />}
                        Create Account & Book
                      </Button>
                    </>
                  )}

                  {/* Logged in user */}
                  {loggedInUser && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder="John Doe"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={customerEmail}
                            disabled
                            className="pl-10 bg-muted"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Common fields */}
                  {(authMode === 'guest' || loggedInUser) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (Optional)</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          placeholder="Any special requests or notes..."
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          rows={3}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-lg">Booking Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Service</span>
                      <span className="font-medium">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{selectedService?.duration} min</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Staff</span>
                      <span className="font-medium">{selectedStaff?.name || 'Any available'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, 'MMM d, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">
                        {selectedTime && format(new Date(`2000-01-01T${selectedTime}`), 'h:mm a')}
                      </span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">Discount ({appliedCoupon.code})</span>
                        <span className="font-medium text-green-600">
                          -{appliedCoupon.discountType === 'percentage' 
                            ? `${appliedCoupon.discount}%` 
                            : formatCurrencySimple(appliedCoupon.discount, business?.currency || 'USD')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 text-lg">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">
                        {selectedService ? (() => {
                          const basePrice = Number(selectedService.price);
                          let finalPrice = basePrice;
                          if (appliedCoupon) {
                            if (appliedCoupon.discountType === 'percentage') {
                              finalPrice = basePrice - (basePrice * appliedCoupon.discount / 100);
                            } else {
                              finalPrice = Math.max(0, basePrice - appliedCoupon.discount);
                            }
                          }
                          return formatCurrencySimple(finalPrice, business?.currency || 'USD');
                        })() : '$0.00'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Coupon Code Input */}
                  <div className="space-y-2 pt-4 border-t border-border">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            Coupon {appliedCoupon.code} applied
                          </span>
                        </div>
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
                      <div className="space-y-2">
                        <Label htmlFor="coupon-code">Have a coupon code?</Label>
                        <div className="flex gap-2">
                          <Input
                            id="coupon-code"
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
                              if (!couponCode.trim() || !selectedService || !business) return;
                              
                              setIsApplyingCoupon(true);
                              setCouponError('');
                              
                              try {
                                const { data, error } = await supabase.rpc('validate_coupon', {
                                  _coupon_code: couponCode.trim(),
                                  _business_id: business.id,
                                  _purchase_amount: Number(selectedService.price),
                                  _service_id: selectedService.id,
                                  _package_template_id: null,
                                });
                                
                                if (error) throw error;
                                
                                if (data && data.length > 0 && data[0].is_valid) {
                                  const result = data[0];
                                  setAppliedCoupon({
                                    code: couponCode.trim(),
                                    discount: Number(result.discount_amount),
                                    discountType: result.coupon_data?.discount_type === 'percentage' ? 'percentage' : 'fixed',
                                  });
                                  toast.success('Coupon applied successfully!');
                                } else {
                                  setCouponError(data?.[0]?.message || 'Invalid coupon code');
                                }
                              } catch (error: any) {
                                setCouponError(error.message || 'Failed to apply coupon');
                                toast.error(error.message || 'Failed to apply coupon');
                              } finally {
                                setIsApplyingCoupon(false);
                              }
                            }}
                            disabled={isApplyingCoupon || !couponCode.trim()}
                          >
                            {isApplyingCoupon ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </Button>
                        </div>
                        {couponError && (
                          <p className="text-sm text-red-600 dark:text-red-400">{couponError}</p>
                        )}
                      </div>
                    )}
                  </div>
                    
                  {/* Recurring Appointment Options */}
                  <div className="space-y-4 pt-4 border-t border-border">
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
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(locations.length > 1 ? 4 : 3)} className="flex-1 sm:flex-initial">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {(authMode === 'guest' || loggedInUser) && (
                <Button
                  disabled={!customerName || !customerEmail || submitting}
                  onClick={handleSubmit}
                  className="flex-1 sm:flex-initial"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer - hidden in embed mode */}
      {!isEmbedded && (
        <footer className="border-t border-border/50 py-6 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>Powered by <span className="font-semibold gradient-text">Bookly</span></p>
          </div>
        </footer>
      )}
    </div>
  );
}