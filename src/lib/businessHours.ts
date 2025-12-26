import { supabase } from '@/integrations/supabase/client';

export interface TimeRange {
  start_time: string;
  end_time: string;
}

/**
 * Get all time ranges for a specific day
 * Returns ranges from business_hour_ranges if they exist, otherwise falls back to open_time/close_time
 */
export async function getDayTimeRanges(
  businessId: string,
  dayOfWeek: number,
  locationId?: string | null
): Promise<TimeRange[]> {
  // First, get the business_hours record for this day
  let query = supabase
    .from('business_hours')
    .select('id, open_time, close_time, is_closed')
    .eq('business_id', businessId)
    .eq('day_of_week', dayOfWeek);

  if (locationId) {
    query = query.eq('location_id', locationId);
  } else {
    query = query.is('location_id', null);
  }

  const { data: dayHours, error } = await query.maybeSingle();

  if (error || !dayHours || dayHours.is_closed) {
    return [];
  }

  // Check if ranges exist for this business_hours record
  const { data: ranges } = await supabase
    .from('business_hour_ranges')
    .select('start_time, end_time')
    .eq('business_hours_id', dayHours.id)
    .order('display_order', { ascending: true })
    .order('start_time', { ascending: true });

  // If ranges exist, use them; otherwise fall back to open_time/close_time
  if (ranges && ranges.length > 0) {
    return ranges.map(r => ({
      start_time: r.start_time.slice(0, 5), // Format as HH:MM
      end_time: r.end_time.slice(0, 5),
    }));
  } else {
    // Fall back to single range from business_hours
    return [{
      start_time: dayHours.open_time.slice(0, 5),
      end_time: dayHours.close_time.slice(0, 5),
    }];
  }
}

/**
 * Check if a time falls within any of the day's time ranges
 */
export function isTimeInRanges(time: string, ranges: TimeRange[]): boolean {
  return ranges.some(range => {
    return time >= range.start_time && time < range.end_time;
  });
}

