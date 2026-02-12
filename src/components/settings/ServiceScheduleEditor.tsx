import { useState, useEffect } from 'react';
import { Clock, Save, X, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
  const label = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { value: time, label };
});

interface ServiceScheduleEditorProps {
  serviceId: string;
  serviceName: string;
  businessOpenTime?: string;
  businessCloseTime?: string;
}

interface DaySchedule {
  day: number;
  name: string;
  useCustomSchedule: boolean;
  ranges: Array<{ id?: string; start_time: string; end_time: string; display_order: number }>;
}

export function ServiceScheduleEditor({
  serviceId,
  serviceName,
  businessOpenTime = '09:00',
  businessCloseTime = '18:00',
}: ServiceScheduleEditorProps) {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<DaySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      const { data: schedules } = await supabase
        .from('service_schedules')
        .select('*')
        .eq('service_id', serviceId)
        .order('day_of_week')
        .order('display_order')
        .order('start_time');

      const byDay: Record<number, Array<{ id?: string; start_time: string; end_time: string; display_order: number }>> = {};
      (schedules || []).forEach((s: any) => {
        const day = s.day_of_week;
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push({
          id: s.id,
          start_time: String(s.start_time).slice(0, 5),
          end_time: String(s.end_time).slice(0, 5),
          display_order: s.display_order,
        });
      });

      setDays(
        DAY_NAMES.map((name, i) => ({
          day: i,
          name,
          useCustomSchedule: (byDay[i]?.length ?? 0) > 0,
          ranges: byDay[i]?.length
            ? byDay[i]
            : [{ start_time: businessOpenTime, end_time: businessCloseTime, display_order: 0 }],
        }))
      );
      setIsLoading(false);
    };
    fetchSchedules();
  }, [serviceId, businessOpenTime, businessCloseTime]);

  const handleToggleCustom = (dayIndex: number, useCustom: boolean) => {
    setDays(prev =>
      prev.map(d =>
        d.day === dayIndex
          ? {
              ...d,
              useCustomSchedule: useCustom,
              ranges: useCustom ? [{ start_time: businessOpenTime, end_time: businessCloseTime, display_order: 0 }] : [],
            }
          : d
      )
    );
  };

  const handleAddRange = (dayIndex: number) => {
    setDays(prev =>
      prev.map(d => {
        if (d.day !== dayIndex || !d.useCustomSchedule) return d;
        const last = d.ranges[d.ranges.length - 1];
        return {
          ...d,
          ranges: [
            ...d.ranges,
            {
              start_time: last?.end_time ?? businessOpenTime,
              end_time: businessCloseTime,
              display_order: d.ranges.length,
            },
          ],
        };
      })
    );
  };

  const handleRemoveRange = (dayIndex: number, rangeIndex: number) => {
    setDays(prev =>
      prev.map(d => {
        if (d.day !== dayIndex) return d;
        const newRanges = d.ranges.filter((_, i) => i !== rangeIndex);
        return {
          ...d,
          ranges: newRanges.length ? newRanges.map((r, i) => ({ ...r, display_order: i })) : [],
        };
      })
    );
  };

  const handleRangeChange = (dayIndex: number, rangeIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setDays(prev =>
      prev.map(d => {
        if (d.day !== dayIndex) return d;
        const ranges = [...d.ranges];
        ranges[rangeIndex] = { ...ranges[rangeIndex], [field]: value };
        return { ...d, ranges };
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete all existing schedules for this service
      await supabase.from('service_schedules').delete().eq('service_id', serviceId);

      // Insert new schedules for days with custom schedule
      const toInsert: Array<{ service_id: string; day_of_week: number; start_time: string; end_time: string; display_order: number }> = [];
      for (const d of days) {
        if (d.useCustomSchedule && d.ranges.length > 0) {
          d.ranges.forEach((r, i) => {
            toInsert.push({
              service_id: serviceId,
              day_of_week: d.day,
              start_time: r.start_time,
              end_time: r.end_time,
              display_order: i,
            });
          });
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('service_schedules').insert(toInsert);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['service-schedules'] });
      toast.success(`Schedule for ${serviceName} saved`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save schedule');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 bg-secondary rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-xs text-muted-foreground mb-2">
        Set when this service is bookable each day. If not set, business hours apply. Useful when 1 employee offers multiple services at different times.
      </p>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Schedule'}
        </Button>
      </div>

      <div className="space-y-4">
        {days.map((day) => (
          <div
            key={day.day}
            className="p-3 sm:p-4 rounded-lg border bg-secondary/30 border-border"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div className="w-full sm:w-24 font-medium text-sm shrink-0">{day.name}</div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={day.useCustomSchedule}
                  onCheckedChange={(checked) => handleToggleCustom(day.day, checked)}
                />
                <Label className="text-xs text-muted-foreground">
                  {day.useCustomSchedule ? 'Custom times' : 'Use business hours'}
                </Label>
              </div>
            </div>

            {day.useCustomSchedule && (
              <div className="space-y-3 mt-4">
                {day.ranges.map((range, rangeIndex) => (
                  <div key={rangeIndex} className="flex items-center gap-2 p-2 bg-background/50 rounded border">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select
                      value={range.start_time}
                      onValueChange={(v) => handleRangeChange(day.day, rangeIndex, 'start_time', v)}
                    >
                      <SelectTrigger className="w-full sm:w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground text-xs shrink-0">to</span>
                    <Select
                      value={range.end_time}
                      onValueChange={(v) => handleRangeChange(day.day, rangeIndex, 'end_time', v)}
                    >
                      <SelectTrigger className="w-full sm:w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {day.ranges.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleRemoveRange(day.day, rangeIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddRange(day.day)}
                  className="w-full sm:w-auto"
                  disabled={day.ranges.length >= 4}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Range {day.ranges.length >= 4 && '(Max 4)'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
