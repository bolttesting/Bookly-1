import { useQueries } from '@tanstack/react-query';
import { format, addMinutes, setMinutes, setHours, startOfDay, isBefore, isAfter } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface UseAvailableSlotsParams {
  businessId: string | undefined;
  serviceId: string | undefined;
  service: {
    duration: number;
    buffer_time?: number;
    slot_capacity?: number;
  };
  locationId: string | null;
  selectedDate: Date | undefined;
}

export function useAvailableSlots({
  businessId,
  serviceId,
  service,
  locationId,
  selectedDate,
}: UseAvailableSlotsParams) {
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  const [
    businessHoursQuery,
    hourRangesQuery,
    slotBlocksQuery,
    serviceSchedulesQuery,
    offDaysQuery,
    existingAppointmentsQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['available-slots-business-hours', businessId],
        queryFn: async () => {
          if (!businessId) return [];
          const { data, error } = await supabase
            .from('business_hours')
            .select('*')
            .eq('business_id', businessId)
            .order('day_of_week')
            .order('location_id', { ascending: true, nullsFirst: true });
          if (error) throw error;
          return data || [];
        },
        enabled: !!businessId,
      },
      {
        queryKey: ['available-slots-hour-ranges', businessId],
        queryFn: async () => {
          if (!businessId) return {};
          const hours = await supabase
            .from('business_hours')
            .select('id')
            .eq('business_id', businessId);
          if (hours.error) throw hours.error;
          const bhIds = (hours.data || []).map((h: { id: string }) => h.id).filter(Boolean);
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
            const bid = (r as { business_hours_id: string }).business_hours_id;
            if (!map[bid]) map[bid] = [];
            map[bid].push({
              start_time: String((r as { start_time: string }).start_time).slice(0, 5),
              end_time: String((r as { end_time: string }).end_time).slice(0, 5),
            });
          }
          return map;
        },
        enabled: !!businessId,
      },
      {
        queryKey: ['available-slots-blocks', businessId, serviceId, dateStr],
        queryFn: async () => {
          if (!businessId || !serviceId || !dateStr) return [];
          const { data, error } = await supabase
            .from('slot_blocks')
            .select('start_time')
            .eq('business_id', businessId)
            .eq('service_id', serviceId)
            .eq('blocked_date', dateStr);
          if (error) throw error;
          return (data || []).map((b: { start_time: string }) => ({
            start_time: String(b.start_time).slice(0, 5),
          }));
        },
        enabled: !!businessId && !!serviceId && !!dateStr,
      },
      {
        queryKey: ['available-slots-service-schedules', businessId, serviceId],
        queryFn: async () => {
          if (!serviceId) return {};
          const { data, error } = await supabase
            .from('service_schedules')
            .select('service_id, day_of_week, start_time, end_time')
            .eq('service_id', serviceId)
            .order('display_order')
            .order('start_time');
          if (error) throw error;
          const map: Record<string, Record<number, Array<{ start_time: string; end_time: string }>>> = {};
          for (const s of data || []) {
            const sid = (s as { service_id: string }).service_id;
            const day = (s as { day_of_week: number }).day_of_week;
            if (!map[sid]) map[sid] = {};
            if (!map[sid][day]) map[sid][day] = [];
            map[sid][day].push({
              start_time: String((s as { start_time: string }).start_time).slice(0, 5),
              end_time: String((s as { end_time: string }).end_time).slice(0, 5),
            });
          }
          return map;
        },
        enabled: !!businessId && !!serviceId,
      },
      {
        queryKey: ['available-slots-off-days', businessId, locationId],
        queryFn: async () => {
          if (!businessId) return [];
          let query = supabase
            .from('off_days')
            .select('off_date')
            .eq('business_id', businessId);
          if (locationId) {
            query = query.or(`location_id.eq.${locationId},location_id.is.null`);
          } else {
            query = query.is('location_id', null);
          }
          const { data, error } = await query;
          if (error) throw error;
          return (data || []).map((d: { off_date: string }) => d.off_date);
        },
        enabled: !!businessId,
      },
      {
        queryKey: ['available-slots-appointments', businessId, dateStr],
        queryFn: async () => {
          if (!businessId || !selectedDate) return [];
          const startOfDayDate = new Date(selectedDate);
          startOfDayDate.setHours(0, 0, 0, 0);
          const endOfDayDate = new Date(selectedDate);
          endOfDayDate.setHours(23, 59, 59, 999);
          const { data, error } = await supabase
            .from('appointments')
            .select('start_time, service_id')
            .eq('business_id', businessId)
            .gte('start_time', startOfDayDate.toISOString())
            .lte('start_time', endOfDayDate.toISOString())
            .in('status', ['confirmed', 'pending']);
          if (error) throw error;
          return data || [];
        },
        enabled: !!businessId && !!dateStr,
      },
    ],
  });

  const businessHours = businessHoursQuery.data || [];
  const hourRangesByBhId = hourRangesQuery.data || {};
  const slotBlocks = slotBlocksQuery.data || [];
  const serviceSchedules = serviceSchedulesQuery.data || {};
  const offDays = offDaysQuery.data || [];
  const existingAppointments = existingAppointmentsQuery.data || [];

  const isLoading =
    businessHoursQuery.isLoading ||
    hourRangesQuery.isLoading ||
    slotBlocksQuery.isLoading ||
    serviceSchedulesQuery.isLoading ||
    offDaysQuery.isLoading ||
    existingAppointmentsQuery.isLoading;

  // Generate available time slots
  const slots: string[] = [];
  if (
    selectedDate &&
    businessId &&
    serviceId &&
    service.duration > 0 &&
    !businessHoursQuery.isLoading &&
    !existingAppointmentsQuery.isLoading
  ) {
    const dayOfWeek = selectedDate.getDay();
    const offDaysSet = new Set(offDays);
    if (offDaysSet.has(format(selectedDate, 'yyyy-MM-dd'))) {
      // Day is off - no slots
    } else {
      let dayHours = locationId
        ? businessHours.find(
            (h: { day_of_week: number; location_id: string | null; is_closed: boolean }) =>
              h.day_of_week === dayOfWeek && h.location_id === locationId && !h.is_closed
          )
        : null;
      if (!dayHours) {
        dayHours = businessHours.find(
          (h: { day_of_week: number; location_id: string | null; is_closed: boolean }) =>
            h.day_of_week === dayOfWeek && h.location_id === null && !h.is_closed
        );
      }

      if (dayHours && !dayHours.is_closed) {
        const openTime = dayHours.open_time || '09:00';
        const closeTime = dayHours.close_time || '18:00';
        const slotInterval = service.duration + (service.buffer_time || 0);
        const capacity = service.slot_capacity || 1;
        const now = new Date();

        const serviceDayRanges = serviceSchedules[serviceId]?.[dayOfWeek];
        const splitRanges =
          dayHours.id && hourRangesByBhId[dayHours.id]?.length
            ? hourRangesByBhId[dayHours.id]
            : null;
        const ranges: Array<{ start_time: string; end_time: string }> =
          serviceDayRanges?.length
            ? serviceDayRanges
            : splitRanges?.length
              ? splitRanges
              : [{ start_time: openTime, end_time: closeTime }];

        const blockedTimes = new Set(slotBlocks.map((b: { start_time: string }) => b.start_time));

        for (const range of ranges) {
          const [openH, openM] = range.start_time.split(':').map(Number);
          const [closeH, closeM] = range.end_time.split(':').map(Number);
          let current = setMinutes(setHours(startOfDay(selectedDate), openH), openM);
          const end = setMinutes(setHours(startOfDay(selectedDate), closeH), closeM);

          while (isBefore(current, end)) {
            const appointmentEnd = addMinutes(current, service.duration);
            if (isAfter(appointmentEnd, end)) break;

            const timeStr = format(current, 'HH:mm');
            if (blockedTimes.has(timeStr)) {
              current = addMinutes(current, slotInterval);
              continue;
            }

            if (!isBefore(current, now)) {
              const booked = existingAppointments.filter(
                (apt: { start_time: string; service_id: string }) => {
                  const aptDate = new Date(apt.start_time);
                  return (
                    format(aptDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd') &&
                    format(aptDate, 'HH:mm') === timeStr &&
                    apt.service_id === serviceId
                  );
                }
              ).length;

              const available = capacity - booked;
              if (available > 0) {
                slots.push(format(current, 'h:mm a'));
              }
            }
            current = addMinutes(current, slotInterval);
          }
        }
      }
    }
  }

  return { slots, isLoading, offDays: offDays as string[] };
}
