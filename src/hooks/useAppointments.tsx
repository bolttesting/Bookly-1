import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useAppointmentReminders } from './useReminders';
import { toast } from 'sonner';
import { notifyBusinessUsers } from '@/lib/notifications';

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded' | 'failed';
  payment_id?: string | null;
  notes: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: { id: string; name: string; email: string | null; phone: string | null };
  service?: { id: string; name: string; duration: number; price: number };
  staff_member?: { id: string; name: string } | null;
}

export interface AppointmentFormData {
  customer_id: string;
  service_id: string;
  staff_id?: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  price?: number;
}

export function useAppointments(dateRange?: { start: Date; end: Date }) {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const { createReminders } = useAppointmentReminders();

  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', business?.id, dateRange?.start?.toISOString(), dateRange?.end?.toISOString()],
    queryFn: async () => {
      if (!business?.id) return [];
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, name, email, phone),
          service:services(id, name, duration, price),
          staff_member:staff_members(id, name)
        `)
        .eq('business_id', business.id)
        .order('start_time', { ascending: true });

      if (dateRange?.start && dateRange?.end) {
        query = query
          .gte('start_time', dateRange.start.toISOString())
          .lte('start_time', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Appointment[];
    },
    enabled: !!business?.id,
  });

  const createAppointment = useMutation({
    mutationFn: async (appointmentData: AppointmentFormData) => {
      if (!business?.id) throw new Error('No business found');

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          business_id: business.id,
          customer_id: appointmentData.customer_id,
          service_id: appointmentData.service_id,
          staff_id: appointmentData.staff_id || null,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          status: appointmentData.status,
          notes: appointmentData.notes || null,
          price: appointmentData.price || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Get full appointment data with relations for welcome email
      const { data: fullAppointment } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, name, email),
          service:services(id, name)
        `)
        .eq('id', data.id)
        .single();
      
      // Check if this is customer's first booking and send welcome email
      if (fullAppointment?.customer?.email) {
        try {
          const { data: previousAppointments } = await supabase
            .from('appointments')
            .select('id')
            .eq('customer_id', appointmentData.customer_id)
            .eq('business_id', business.id)
            .neq('id', data.id)
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
                    customerEmail: fullAppointment.customer.email,
                    customerName: fullAppointment.customer.name,
                    businessName: business.name,
                    businessPhone: business.phone,
                    businessAddress: business.address ? `${business.address}${business.city ? `, ${business.city}` : ''}` : null,
                    bookingUrl: `${window.location.origin}/book/${business.slug}`,
                  },
                });
              } catch (welcomeEmailError) {
                console.error('Failed to send welcome email:', welcomeEmailError);
                // Don't fail the appointment creation if welcome email fails
              }
            }
          }
        } catch (welcomeCheckError) {
          console.error('Failed to check for welcome email:', welcomeCheckError);
          // Don't fail the appointment creation if welcome check fails
        }
      }
      
      // Create reminders for the new appointment
      try {
        await createReminders.mutateAsync(data.id);
      } catch (reminderError) {
        console.error('Failed to create reminders:', reminderError);
        // Don't fail the appointment creation if reminders fail
      }

      // Create notification for business owners/admins
      if (fullAppointment?.customer && fullAppointment?.service) {
        const appointmentDate = new Date(data.start_time);
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
          message: `${fullAppointment.customer.name} booked ${fullAppointment.service.name} on ${formattedDate} at ${formattedTime}`,
          type: 'appointment',
          link: '/calendar',
        });
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      toast.success('Appointment booked successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to book appointment');
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({ id, ...appointmentData }: AppointmentFormData & { id: string }) => {
      // Get old appointment data to check for reschedule
      const { data: oldAppointment } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, name, email),
          service:services(id, name),
          staff_member:staff_members(id, name)
        `)
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('appointments')
        .update({
          customer_id: appointmentData.customer_id,
          service_id: appointmentData.service_id,
          staff_id: appointmentData.staff_id || null,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          status: appointmentData.status,
          notes: appointmentData.notes || null,
          price: appointmentData.price || null,
        })
        .eq('id', id)
        .select(`
          *,
          customer:customers(id, name, email),
          service:services(id, name),
          staff_member:staff_members(id, name)
        `)
        .single();

      if (error) throw error;

      // Check if this is a reschedule (date/time changed)
      if (oldAppointment && data) {
        const oldStart = new Date(oldAppointment.start_time);
        const newStart = new Date(data.start_time);
        const isReschedule = oldStart.getTime() !== newStart.getTime();

        if (isReschedule && data.customer && data.service && business) {
          // Check if reschedule email is enabled
          const { data: emailSettings } = await supabase
            .from('reminder_settings')
            .select('send_reschedule_email')
            .eq('business_id', business.id)
            .maybeSingle();

          if (emailSettings?.send_reschedule_email !== false) {
            try {
              const oldDate = oldStart.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const oldTime = oldStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const newDate = newStart.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
              const newTime = newStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

              await supabase.functions.invoke('send-reschedule-email', {
                body: {
                  customerEmail: data.customer.email,
                  customerName: data.customer.name,
                  serviceName: data.service.name,
                  businessName: business.name,
                  oldDate,
                  oldTime,
                  newDate,
                  newTime,
                  staffName: data.staff_member?.name,
                },
              });
            } catch (emailError) {
              console.error('Failed to send reschedule email:', emailError);
              // Don't fail the update if email fails
            }
          }
        }

        // Create notification for business owners/admins about reschedule
        if (data.customer && data.service && business) {
          const oldDate = oldStart.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
          const oldTime = oldStart.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          const newDate = newStart.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
          const newTime = newStart.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });

          await notifyBusinessUsers(business.id, {
            title: 'Appointment Rescheduled',
            message: `${data.customer.name} rescheduled ${data.service.name} from ${oldDate} ${oldTime} to ${newDate} ${newTime}`,
            type: 'appointment',
            link: '/calendar',
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Appointment updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update appointment');
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      // Get appointment data before deleting for email
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, name, email),
          service:services(id, name),
          staff_member:staff_members(id, name)
        `)
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Create notification for business owners/admins about cancellation
      if (appointment && appointment.customer && appointment.service && business) {
        const appointmentDate = new Date(appointment.start_time);
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
          title: 'Appointment Cancelled',
          message: `${appointment.customer.name} cancelled ${appointment.service.name} on ${formattedDate} at ${formattedTime}`,
          type: 'appointment',
          link: '/calendar',
        });
      }

      // Send cancellation email if enabled
      if (appointment && appointment.customer && appointment.service && business) {
        // Check if cancellation email is enabled
        const { data: emailSettings } = await supabase
          .from('reminder_settings')
          .select('send_cancellation_email')
          .eq('business_id', business.id)
          .maybeSingle();

        if (emailSettings?.send_cancellation_email !== false) {
          try {
            const appointmentDate = new Date(appointment.start_time);
            const formattedDate = appointmentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const formattedTime = appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

            await supabase.functions.invoke('send-cancellation-email', {
              body: {
                customerEmail: appointment.customer.email,
                customerName: appointment.customer.name,
                serviceName: appointment.service.name,
                businessName: business.name,
                appointmentDate: formattedDate,
                appointmentTime: formattedTime,
                staffName: appointment.staff_member?.name,
              },
            });
          } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
            // Don't fail the deletion if email fails
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Appointment cancelled');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment');
    },
  });

  const markPaymentReceived = useMutation({
    mutationFn: async ({ appointmentId, amount, paymentMethod = 'cash' }: { 
      appointmentId: string; 
      amount: number;
      paymentMethod?: string;
    }) => {
      if (!business?.id) throw new Error('Business not found');

      // Get appointment details
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select('price, payment_status, customer_id')
        .eq('id', appointmentId)
        .single();

      if (aptError || !appointment) throw new Error('Appointment not found');

      const totalPrice = appointment.price || 0;
      const currentPaymentStatus = appointment.payment_status || 'pending';

      // Determine new payment status
      let newPaymentStatus: 'paid' | 'partial' = 'paid';
      if (currentPaymentStatus === 'partial' || amount < totalPrice) {
        newPaymentStatus = 'partial';
      }

      // Create payment record
      const currency = business?.currency || 'USD';

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          business_id: business.id,
          customer_id: appointment.customer_id,
          appointment_id: appointmentId,
          amount,
          currency,
          status: 'completed',
          payment_method: paymentMethod,
        })
        .select('id')
        .single();

      if (paymentError) throw paymentError;

      // Update appointment payment status
      const { data: updatedAppointment, error: updateError } = await supabase
        .from('appointments')
        .update({
          payment_status: newPaymentStatus,
          payment_id: payment.id,
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Get customer and appointment details for notification
      const { data: appointmentDetails } = await supabase
        .from('appointments')
        .select(`
          customer:customers(name),
          service:services(name)
        `)
        .eq('id', appointmentId)
        .single();

      // Create notification for business owners/admins about payment
      if (appointmentDetails) {
        const customerName = (appointmentDetails.customer as any)?.name || 'Customer';
        const serviceName = (appointmentDetails.service as any)?.name || 'Service';
        const paymentStatusText = newPaymentStatus === 'paid' ? 'fully paid' : 'partially paid';

        await notifyBusinessUsers(business.id, {
          title: 'Payment Received',
          message: `Payment of ${amount.toFixed(2)} received from ${customerName} for ${serviceName} (${paymentStatusText})`,
          type: 'appointment',
          link: '/calendar',
        });
      }

      return updatedAppointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-services'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-staff'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to record payment');
    },
  });

  return {
    appointments,
    isLoading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    markPaymentReceived,
  };
}
