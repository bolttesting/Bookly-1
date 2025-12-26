import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';
import { notifyBusinessUsers } from '@/lib/notifications';

export interface RescheduleRequest {
  id: string;
  appointment_id: string;
  business_id: string;
  customer_id: string;
  requested_by_user_id: string | null;
  old_start_time: string;
  old_end_time: string;
  new_start_time: string;
  new_end_time: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  appointment?: {
    id: string;
    customer?: { name: string; email: string | null };
    service?: { name: string };
    staff_member?: { name: string } | null;
  };
}

export function useRescheduleRequests() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['reschedule-requests', business?.id],
    queryFn: async (): Promise<RescheduleRequest[]> => {
      if (!business?.id) return [];

      const { data, error } = await supabase
        .from('reschedule_requests')
        .select(`
          *,
          appointment:appointments(
            id,
            customer:customers(name, email),
            service:services(name),
            staff_member:staff_members(name)
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RescheduleRequest[];
    },
    enabled: !!business?.id,
  });

  const createRequest = useMutation({
    mutationFn: async ({
      appointmentId,
      newStartTime,
      newEndTime,
      reason,
    }: {
      appointmentId: string;
      newStartTime: string;
      newEndTime: string;
      reason?: string;
    }) => {
      // Get appointment details including business_id
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select('customer_id, business_id, start_time, end_time')
        .eq('id', appointmentId)
        .single();

      if (aptError || !appointment) throw new Error('Appointment not found');
      if (!appointment.business_id) throw new Error('Business not found');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('reschedule_requests')
        .insert({
          appointment_id: appointmentId,
          business_id: appointment.business_id,
          customer_id: appointment.customer_id,
          requested_by_user_id: user?.id || null,
          old_start_time: appointment.start_time,
          old_end_time: appointment.end_time,
          new_start_time: newStartTime,
          new_end_time: newEndTime,
          reason: reason || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Get customer and service info for notification
      const { data: customerData } = await supabase
        .from('customers')
        .select('name')
        .eq('id', appointment.customer_id)
        .single();

      const { data: serviceData } = await supabase
        .from('appointments')
        .select('service:services(name)')
        .eq('id', appointmentId)
        .single();

      const serviceName = (serviceData as any)?.service?.name || 'Service';
      const customerName = customerData?.name || 'Customer';
      const formattedOldDate = new Date(appointment.start_time).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedOldTime = new Date(appointment.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      // Get all business owners and admins to notify them
      const { data: businessUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('business_id', appointment.business_id)
        .in('role', ['owner', 'admin']);

      if (businessUsers && businessUsers.length > 0) {
        // Create notifications for all business owners/admins
        const notifications = businessUsers.map(role => ({
          user_id: role.user_id,
          business_id: appointment.business_id,
          title: 'New Reschedule Request',
          message: `${customerName} requested to reschedule ${serviceName} from ${formattedOldDate} at ${formattedOldTime}`,
          type: 'appointment',
          link: '/calendar',
          read: false,
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Reschedule request submitted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit reschedule request');
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({
      requestId,
      appointmentId,
      newStartTime,
      newEndTime,
    }: {
      requestId: string;
      appointmentId: string;
      newStartTime: string;
      newEndTime: string;
    }) => {
      if (!business?.id) throw new Error('Business not found');

      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();

      // Get appointment details for email
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customers(id, name, email),
          service:services(id, name),
          staff_member:staff_members(id, name)
        `)
        .eq('id', appointmentId)
        .single();

      if (aptError || !appointment) throw new Error('Appointment not found');

      // Get request details for old time
      const { data: request, error: reqError } = await supabase
        .from('reschedule_requests')
        .select('old_start_time, old_end_time')
        .eq('id', requestId)
        .single();

      if (reqError || !request) throw new Error('Reschedule request not found');

      // Update appointment
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          start_time: newStartTime,
          end_time: newEndTime,
        })
        .eq('id', appointmentId);

      if (updateError) throw updateError;

      // Update request status
      const { data, error } = await supabase
        .from('reschedule_requests')
        .update({
          status: 'approved',
          reviewed_by_user_id: user?.id || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Send reschedule email if enabled
      if (appointment.customer?.email) {
        try {
          const { data: emailSettings } = await supabase
            .from('reminder_settings')
            .select('send_reschedule_email')
            .eq('business_id', business.id)
            .maybeSingle();

          if (emailSettings?.send_reschedule_email === true) {
            await supabase.functions.invoke('send-reschedule-email', {
              body: {
                customerEmail: appointment.customer.email,
                customerName: appointment.customer.name,
                serviceName: (appointment.service as any)?.name || 'Service',
                businessName: business.name,
                oldDate: new Date(request.old_start_time).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                oldTime: new Date(request.old_start_time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }),
                newDate: new Date(newStartTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                newTime: new Date(newStartTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }),
                staffName: (appointment.staff_member as any)?.name || null,
              },
            });
          }
        } catch (emailError) {
          console.error('Failed to send reschedule email:', emailError);
          // Don't fail the approval if email fails
        }
      }

      // Create notification for business owners/admins about approved reschedule
      if (appointment.customer && appointment.service) {
        const oldDate = new Date(request.old_start_time).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        const newDate = new Date(newStartTime).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });

        await notifyBusinessUsers(business.id, {
          title: 'Reschedule Request Approved',
          message: `Reschedule request for ${appointment.customer.name}'s ${appointment.service.name} has been approved (${oldDate} → ${newDate})`,
          type: 'appointment',
          link: '/calendar',
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      toast.success('Reschedule request approved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to approve reschedule request');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({
      requestId,
      rejectionReason,
    }: {
      requestId: string;
      rejectionReason?: string;
    }) => {
      if (!business?.id) throw new Error('Business not found');

      // Get current user (admin)
      const { data: { user } } = await supabase.auth.getUser();

      // Get request details with appointment info for email
      const { data: request, error: reqError } = await supabase
        .from('reschedule_requests')
        .select(`
          *,
          appointment:appointments(
            id,
            customer:customers(id, name, email),
            service:services(id, name),
            staff_member:staff_members(id, name),
            start_time,
            end_time
          )
        `)
        .eq('id', requestId)
        .single();

      if (reqError || !request) throw new Error('Reschedule request not found');

      const { data, error } = await supabase
        .from('reschedule_requests')
        .update({
          status: 'rejected',
          reviewed_by_user_id: user?.id || null,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Send notification email to customer (optional - we can use reschedule email with a note)
      const appointment = (request as any).appointment;
      if (appointment?.customer?.email) {
        try {
          // We can send a simple notification email or use the reschedule email template
          // For now, we'll just log it - you can create a dedicated rejection email function later
          console.log('Reschedule request rejected for:', appointment.customer.email);
          // TODO: Create send-reschedule-rejection-email function if needed
        } catch (emailError) {
          console.error('Failed to send rejection notification:', emailError);
          // Don't fail the rejection if email fails
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reschedule-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      toast.success('Reschedule request rejected');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject reschedule request');
    },
  });

  return {
    requests,
    isLoading,
    createRequest,
    approveRequest,
    rejectRequest,
    pendingRequests: requests.filter(r => r.status === 'pending'),
  };
}

