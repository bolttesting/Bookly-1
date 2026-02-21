import { useState, useEffect, useRef } from 'react';
import { Clock, Save, X, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useBusiness } from '@/hooks/useBusiness';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

interface SplitHoursEditorProps {
  locationId?: string | null;
  locationName?: string;
}

export function SplitHoursEditor({ locationId, locationName }: SplitHoursEditorProps) {
  const { business } = useBusiness();
  const { hoursByDay, isLoading, saveHours } = useBusinessHours(undefined, locationId);
  const queryClient = useQueryClient();
  const [localHours, setLocalHours] = useState<typeof hoursByDay>([]);
  const [rangesByDay, setRangesByDay] = useState<Record<number, Array<{ id?: string; start_time: string; end_time: string; display_order: number }>>>({});
  const initialized = useRef(false);

  // Initialize and resync when hoursByDay changes (handles tab switch + cache refresh)
  useEffect(() => {
    if (!isLoading && hoursByDay.length === 7) {
      const dataSignature = hoursByDay.map(h => `${h.id}|${h.open_time}|${h.close_time}|${h.is_closed}`).join(';');
      const prevSignature = localHours.length === 7
        ? localHours.map(h => `${h.id}|${h.open_time}|${h.close_time}|${h.is_closed}`).join(';')
        : '';
      if (!initialized.current || dataSignature !== prevSignature) {
        setLocalHours(hoursByDay);

        const fetchRanges = async () => {
          const newRanges: typeof rangesByDay = {};
          for (const day of hoursByDay) {
            if (day.is_closed) continue;
            if (day.id) {
              const { data: ranges } = await supabase
                .from('business_hour_ranges')
                .select('*')
                .eq('business_hours_id', day.id)
                .order('display_order', { ascending: true })
                .order('start_time', { ascending: true });

              if (ranges && ranges.length > 0) {
                newRanges[day.day] = ranges.map(r => ({
                  id: r.id,
                  start_time: r.start_time.slice(0, 5),
                  end_time: r.end_time.slice(0, 5),
                  display_order: r.display_order,
                }));
              } else {
                newRanges[day.day] = [{
                  start_time: day.open_time,
                  end_time: day.close_time,
                  display_order: 0,
                }];
              }
            } else {
              // No DB row yet (e.g. default hours never saved) - use open/close from day so UI is editable
              newRanges[day.day] = [{
                start_time: day.open_time,
                end_time: day.close_time,
                display_order: 0,
              }];
            }
          }
          setRangesByDay(newRanges);
          initialized.current = true;
        };
        fetchRanges();
      }
    }
  }, [hoursByDay, isLoading]);

  // Reset when switching locations
  useEffect(() => {
    initialized.current = false;
    setLocalHours([]);
    setRangesByDay({});
  }, [locationId]);

  const handleToggleClosed = (dayIndex: number, closed: boolean) => {
    setLocalHours(prev =>
      prev.map(h => (h.day === dayIndex ? { ...h, is_closed: closed } : h))
    );
    if (closed) {
      setRangesByDay(prev => {
        const newRanges = { ...prev };
        delete newRanges[dayIndex];
        return newRanges;
      });
    }
  };

  const handleAddRange = (dayIndex: number) => {
    const day = localHours.find(h => h.day === dayIndex);
    if (!day || day.is_closed) return;

    const existingRanges = rangesByDay[dayIndex] || [];
    const lastRange = existingRanges[existingRanges.length - 1];
    const defaultStart = lastRange ? lastRange.end_time : day.open_time;
    const defaultEnd = day.close_time;

    setRangesByDay(prev => ({
      ...prev,
      [dayIndex]: [
        ...(prev[dayIndex] || []),
        {
          start_time: defaultStart,
          end_time: defaultEnd,
          display_order: existingRanges.length,
        },
      ],
    }));
  };

  const handleRemoveRange = (dayIndex: number, rangeIndex: number) => {
    setRangesByDay(prev => {
      const ranges = prev[dayIndex] || [];
      if (ranges.length <= 1) return prev; // Keep at least one range
      return {
        ...prev,
        [dayIndex]: ranges.filter((_, i) => i !== rangeIndex).map((r, i) => ({
          ...r,
          display_order: i,
        })),
      };
    });
  };

  const handleRangeChange = (dayIndex: number, rangeIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setRangesByDay(prev => {
      const ranges = [...(prev[dayIndex] || [])];
      ranges[rangeIndex] = { ...ranges[rangeIndex], [field]: value };
      return { ...prev, [dayIndex]: ranges };
    });
  };

  const handleSave = async () => {
    try {
      // First save the base business hours
      await saveHours.mutateAsync(
        localHours.map(h => ({
          day_of_week: h.day,
          open_time: h.open_time,
          close_time: h.close_time,
          is_closed: h.is_closed,
        }))
      );

      // Wait for hours to be saved, then refetch to get updated IDs
      await queryClient.refetchQueries({ queryKey: ['business-hours'] });
      
      if (!business?.id) throw new Error('No business found');

      // Refetch hours directly to get the updated IDs
      let query = supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', business.id)
        .order('day_of_week');

      if (locationId) {
        query = query.eq('location_id', locationId);
      } else {
        query = query.is('location_id', null);
      }

      const { data: hoursData, error: hoursError } = await query;
      if (hoursError) throw hoursError;

      // Update localHours with new IDs
      const updatedLocalHours = localHours.map(localDay => {
        const updatedDay = hoursData?.find(h => h.day_of_week === localDay.day);
        return updatedDay ? { ...localDay, id: updatedDay.id } : localDay;
      });
      setLocalHours(updatedLocalHours);

      // Then save ranges for each day
      for (const [dayIndexStr, ranges] of Object.entries(rangesByDay)) {
        const dayIndex = parseInt(dayIndexStr);
        const day = updatedLocalHours.find(h => h.day === dayIndex);
        if (!day?.id || day.is_closed || !ranges.length) continue;

        // Delete all existing ranges for this day
        const { data: existingRanges } = await (supabase
          .from('business_hour_ranges' as any)
          .select('id')
          .eq('business_hours_id', day.id) as any);

        if (existingRanges && existingRanges.length > 0) {
          const { error: deleteError } = await (supabase
            .from('business_hour_ranges' as any)
            .delete()
            .in('id', existingRanges.map((r: any) => r.id)) as any);
          
          if (deleteError) {
            console.error('Error deleting ranges:', deleteError);
            throw deleteError;
          }
        }

        // Insert new ranges
        if (ranges.length > 0) {
          const { error: insertError } = await (supabase
            .from('business_hour_ranges' as any)
            .insert(
              ranges.map((r, index) => ({
                business_hours_id: day.id,
                start_time: r.start_time,
                end_time: r.end_time,
                display_order: index,
              }))
            ) as any);

          if (insertError) {
            console.error('Error inserting ranges:', insertError);
            throw insertError;
          }
        }
      }

      // Invalidate all range queries
      queryClient.invalidateQueries({ queryKey: ['business-hour-ranges'] });
      
      // Reset initialized flag and refetch ranges
      initialized.current = false;
      
      // Refetch ranges for all days
      const newRanges: typeof rangesByDay = {};
      for (const day of updatedLocalHours) {
        if (day.id && !day.is_closed) {
          const { data: ranges } = await (supabase
            .from('business_hour_ranges' as any)
            .select('*')
            .eq('business_hours_id', day.id)
            .order('display_order', { ascending: true })
            .order('start_time', { ascending: true }) as any);

          if (ranges && ranges.length > 0) {
            newRanges[day.day] = ranges.map((r: any) => ({
              id: r.id,
              start_time: r.start_time.slice(0, 5),
              end_time: r.end_time.slice(0, 5),
              display_order: r.display_order,
            }));
          } else {
            // If no ranges exist, create default from open_time/close_time
            newRanges[day.day] = [{
              start_time: day.open_time,
              end_time: day.close_time,
              display_order: 0,
            }];
          }
        }
      }
      setRangesByDay(newRanges);
      
      toast.success('Business hours and time ranges saved successfully');
    } catch (error: any) {
      console.error('Error saving hours:', error);
      toast.error(error.message || 'Failed to save hours');
    }
  };

  if (isLoading || localHours.length === 0) {
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
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveHours.isPending} size="sm" className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {saveHours.isPending ? 'Saving...' : 'Save Hours'}
        </Button>
      </div>

      <div className="space-y-4">
        {localHours.map((day) => {
          const dayRanges = rangesByDay[day.day] || [];
          const hasRanges = dayRanges.length > 0;

          return (
            <div
              key={day.day}
              className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                day.is_closed ? 'bg-muted/50 border-border/50' : 'bg-secondary/30 border-border'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
                <div className="w-full sm:w-24 font-medium text-sm shrink-0">{day.name}</div>

                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    checked={!day.is_closed}
                    onCheckedChange={(checked) => handleToggleClosed(day.day, !checked)}
                  />
                  <Label className="text-xs text-muted-foreground">
                    {day.is_closed ? 'Closed' : 'Open'}
                  </Label>
                </div>
              </div>

              {!day.is_closed && (
                <div className="space-y-3 mt-4">
                  {hasRanges ? (
                    dayRanges.map((range, rangeIndex) => (
                      <div key={rangeIndex} className="flex items-center gap-2 p-2 bg-background/50 rounded border">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Select
                          value={range.start_time}
                          onValueChange={(value) => handleRangeChange(day.day, rangeIndex, 'start_time', value)}
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
                          onValueChange={(value) => handleRangeChange(day.day, rangeIndex, 'end_time', value)}
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
                        {dayRanges.length > 1 && (
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
                    ))
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-background/50 rounded border">
                      <Select
                        value={day.open_time}
                        onValueChange={(value) => {
                          setLocalHours(prev =>
                            prev.map(h => (h.day === day.day ? { ...h, open_time: value } : h))
                          );
                          setRangesByDay(prev => ({
                            ...prev,
                            [day.day]: [{ start_time: value, end_time: day.close_time, display_order: 0 }],
                          }));
                        }}
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
                        value={day.close_time}
                        onValueChange={(value) => {
                          setLocalHours(prev =>
                            prev.map(h => (h.day === day.day ? { ...h, close_time: value } : h))
                          );
                          setRangesByDay(prev => ({
                            ...prev,
                            [day.day]: [{ start_time: day.open_time, end_time: value, display_order: 0 }],
                          }));
                        }}
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
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddRange(day.day)}
                    className="w-full sm:w-auto"
                    disabled={dayRanges.length >= 4} // Max 4 ranges per day
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Range {dayRanges.length >= 4 && '(Max 4)'}
                  </Button>
                </div>
              )}

              {day.is_closed && (
                <span className="text-xs text-muted-foreground italic">
                  Not available
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

