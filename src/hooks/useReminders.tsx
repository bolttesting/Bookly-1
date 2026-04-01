import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { toast } from 'sonner';

export interface ReminderSettings {
  id: string;
  business_id: string;
  enable_email_reminders: boolean;
  enable_sms_reminders: boolean;
  reminder_hours_before: number[];
  email_template: string | null;
  sms_template: string | null;
  send_reminder_on_booking: boolean;
  send_booking_confirmation?: boolean;
  send_cancellation_email?: boolean;
  send_reschedule_email?: boolean;
  send_welcome_email?: boolean;
  send_followup_email?: boolean;
  followup_days_after?: number;
  auto_confirm_bookings?: boolean;
  notify_new_bookings?: boolean;
  notify_cancellations?: boolean;
  notify_daily_summary?: boolean;
  notify_marketing_updates?: boolean;
}

function normalizeReminderSettingsRpcData(data: unknown): ReminderSettings | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const row = data[0];
    return row && typeof row === 'object' ? (row as ReminderSettings) : null;
  }
  if (typeof data === 'object') return data as ReminderSettings;
  return null;
}

function isRpcNotDeployedError(err: { code?: string; message?: string }): boolean {
  const msg = (err.message ?? '').toLowerCase();
  return (
    err.code === 'PGRST202' ||
    err.code === '42883' ||
    msg.includes('could not find') ||
    msg.includes('does not exist') ||
    msg.includes('unknown function')
  );
}

/** Prefer DB RPC (bypasses RLS on insert); falls back to REST if migration not applied yet. */
async function loadReminderSettingsRow(businessId: string): Promise<ReminderSettings> {
  const { data, error } = await supabase.rpc('ensure_reminder_settings_for_business', {
    p_business_id: businessId,
  });

  if (!error) {
    const row = normalizeReminderSettingsRpcData(data);
    if (row) return row;
    throw new Error('No reminder settings returned');
  }

  if (!isRpcNotDeployedError(error)) {
    console.error('ensure_reminder_settings_for_business:', error);
    throw error;
  }

  const { data: existing, error: selErr } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();
  if (selErr) {
    console.error('Error fetching reminder settings:', selErr);
    throw selErr;
  }
  if (existing) return existing as ReminderSettings;

  const { data: inserted, error: insErr } = await supabase
    .from('reminder_settings')
    .insert({
      business_id: businessId,
      enable_email_reminders: true,
      enable_sms_reminders: false,
      reminder_hours_before: [24, 2],
      send_reminder_on_booking: true,
      send_booking_confirmation: true,
      send_cancellation_email: true,
      send_reschedule_email: true,
      send_welcome_email: false,
      send_followup_email: false,
      followup_days_after: 1,
      auto_confirm_bookings: true,
      notify_new_bookings: true,
      notify_cancellations: true,
      notify_daily_summary: false,
      notify_marketing_updates: false,
    })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      const { data: row, error: again } = await supabase
        .from('reminder_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
      if (!again && row) return row as ReminderSettings;
    }
    console.error('Error creating reminder settings:', insErr);
    throw insErr;
  }

  return inserted as ReminderSettings;
}

export interface AppointmentReminder {
  id: string;
  appointment_id: string;
  business_id: string;
  customer_id: string;
  reminder_type: 'email' | 'sms' | 'both';
  reminder_time: string;
  hours_before: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
}

export function useReminderSettings() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: settings, isFetching, isPending } = useQuery({
    queryKey: ['reminder-settings', business?.id],
    queryFn: async (): Promise<ReminderSettings> => {
      if (!business?.id) throw new Error('No business');
      return loadReminderSettingsRow(business.id);
    },
    enabled: !!business?.id,
    retry: (failureCount, err) => {
      const msg = String((err as Error)?.message ?? '');
      if (msg.includes('Not allowed for this business')) return false;
      return failureCount < 5;
    },
    retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 5000),
  });

  // With enabled: false, React Query v5 keeps isPending false while data is undefined — Settings
  // would show "Failed to load". Treat "no business yet" and active fetch as loading.
  const isLoading = !business?.id || isFetching || isPending;

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<ReminderSettings>) => {
      if (!business?.id) throw new Error('Business not found');

      const { data, error } = await supabase
        .from('reminder_settings')
        .update(updates)
        .eq('business_id', business.id)
        .select()
        .single();

      if (error) throw error;
      return data as ReminderSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
      toast.success('Reminder settings updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update reminder settings');
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
}

export function useAppointmentReminders(appointmentId?: string) {
  const { business } = useBusiness();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['appointment-reminders', appointmentId, business?.id],
    queryFn: async (): Promise<AppointmentReminder[]> => {
      if (!business?.id) return [];

      let query = supabase
        .from('appointment_reminders')
        .select('*')
        .eq('business_id', business.id);

      if (appointmentId) {
        query = query.eq('appointment_id', appointmentId);
      }

      const { data, error } = await query.order('reminder_time', { ascending: true });

      if (error) {
        console.error('Error fetching reminders:', error);
        return [];
      }

      return (data || []) as AppointmentReminder[];
    },
    enabled: !!business?.id,
  });

  const createReminders = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!business?.id) throw new Error('Business not found');

      const settings = await loadReminderSettingsRow(business.id);

      if (!settings.enable_email_reminders && !settings.enable_sms_reminders) {
        return; // No reminders enabled
      }

      // Get appointment details
      const { data: appointment, error: aptError } = await supabase
        .from('appointments')
        .select('start_time, customer_id')
        .eq('id', appointmentId)
        .single();

      if (aptError || !appointment) throw new Error('Appointment not found');

      const appointmentTime = new Date(appointment.start_time);
      const remindersToCreate = [];

      // Create reminders for each configured hour
      for (const hoursBefore of settings.reminder_hours_before || [24, 2]) {
        const reminderTime = new Date(appointmentTime.getTime() - hoursBefore * 60 * 60 * 1000);
        
        // Only create reminder if it's in the future
        if (reminderTime > new Date()) {
          const reminderType = settings.enable_email_reminders && settings.enable_sms_reminders
            ? 'both'
            : settings.enable_email_reminders
            ? 'email'
            : 'sms';

          remindersToCreate.push({
            appointment_id: appointmentId,
            business_id: business.id,
            customer_id: appointment.customer_id,
            reminder_type: reminderType,
            reminder_time: reminderTime.toISOString(),
            hours_before: hoursBefore,
            status: 'pending',
          });
        }
      }

      if (remindersToCreate.length > 0) {
        const { error } = await supabase
          .from('appointment_reminders')
          .insert(remindersToCreate);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-reminders'] });
    },
    onError: (error: Error) => {
      console.error('Error creating reminders:', error);
      // Don't show error toast - reminders are non-critical
    },
  });

  return {
    reminders,
    isLoading,
    createReminders,
  };
}

