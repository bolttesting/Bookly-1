import { useState } from 'react';
import { format, startOfDay, endOfDay, isBefore } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarIcon, CheckCircle2, XCircle, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AppointmentWithDetails {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  attendance_status: string | null;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  service: { id: string; name: string; duration: number };
}

export default function Attendance() {
  const { business } = useBusiness();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['attendance-appointments', business?.id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!business?.id) return [];
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          attendance_status,
          customer:customers(id, name, email, phone),
          service:services(id, name, duration)
        `)
        .eq('business_id', business.id)
        .gte('start_time', dayStart.toISOString())
        .lte('start_time', dayEnd.toISOString())
        .in('status', ['confirmed', 'pending', 'completed'])
        .order('start_time');

      if (error) throw error;
      return (data || []) as AppointmentWithDetails[];
    },
    enabled: !!business?.id,
  });

  const markAttendance = useMutation({
    mutationFn: async ({
      appointmentId,
      attendanceStatus,
    }: {
      appointmentId: string;
      attendanceStatus: 'present' | 'no_show';
    }) => {
      const updates: Record<string, unknown> = {
        attendance_status: attendanceStatus,
        status: attendanceStatus === 'present' ? 'completed' : 'cancelled',
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId);
      if (error) throw error;
    },
    onSuccess: (_, { attendanceStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success(
        attendanceStatus === 'present'
          ? 'Marked as present'
          : 'Marked as did not appear (non-refundable)'
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update attendance');
    },
  });

  // Group appointments by service and time slot
  const groupedByServiceAndSlot = appointments.reduce<
    Record<string, Record<string, AppointmentWithDetails[]>>
  >((acc, apt) => {
    const serviceName = apt.service?.name || 'Unknown';
    const timeKey = format(new Date(apt.start_time), 'HH:mm');
    if (!acc[serviceName]) acc[serviceName] = {};
    if (!acc[serviceName][timeKey]) acc[serviceName][timeKey] = [];
    acc[serviceName][timeKey].push(apt);
    return acc;
  }, {});

  const now = new Date();

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Attendance
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Mark customers as present or did not appear. No-shows are non-refundable.
          </p>
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="shrink-0">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'PPP')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setCalendarOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : appointments.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-base font-medium">No appointments for this date</p>
            <p className="text-sm mt-1">Select another date to view and mark attendance</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByServiceAndSlot).map(([serviceName, slots]) => (
            <Card key={serviceName} className="glass-card overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{serviceName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(slots)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([timeKey, slotAppointments]) => {
                    const timeLabel = format(
                      new Date(`2000-01-01T${timeKey}:00`),
                      'h:mm a'
                    );
                    return (
                      <div
                        key={timeKey}
                        className="rounded-lg border border-border bg-muted/30 p-4 space-y-3"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {timeLabel}
                        </div>
                        <div className="space-y-2">
                          {slotAppointments.map((apt) => {
                            const slotTime = new Date(apt.start_time);
                            const canMark = isBefore(slotTime, now);
                            const isMarked =
                              apt.attendance_status === 'present' ||
                              apt.attendance_status === 'no_show';

                            return (
                              <div
                                key={apt.id}
                                className={cn(
                                  'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg',
                                  apt.attendance_status === 'present' && 'bg-success/10 border border-success/20',
                                  apt.attendance_status === 'no_show' && 'bg-destructive/10 border border-destructive/20'
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">
                                      {apt.customer?.name || 'Unknown'}
                                    </p>
                                    {apt.customer?.phone && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {apt.customer.phone}
                                      </p>
                                    )}
                                  </div>
                                  {isMarked && (
                                    <Badge
                                      variant={
                                        apt.attendance_status === 'present'
                                          ? 'default'
                                          : 'destructive'
                                      }
                                      className="shrink-0"
                                    >
                                      {apt.attendance_status === 'present' ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Present
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="h-3 w-3 mr-1" />
                                          No-show
                                        </>
                                      )}
                                    </Badge>
                                  )}
                                </div>
                                {!isMarked && (
                                  <div className="flex gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="bg-success hover:bg-success/90"
                                      disabled={!canMark || markAttendance.isPending}
                                      onClick={() =>
                                        markAttendance.mutate({
                                          appointmentId: apt.id,
                                          attendanceStatus: 'present',
                                        })
                                      }
                                    >
                                      {markAttendance.isPending &&
                                      markAttendance.variables?.appointmentId === apt.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <CheckCircle2 className="h-4 w-4 mr-1" />
                                          Present
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={!canMark || markAttendance.isPending}
                                      onClick={() =>
                                        markAttendance.mutate({
                                          appointmentId: apt.id,
                                          attendanceStatus: 'no_show',
                                        })
                                      }
                                    >
                                      {markAttendance.isPending &&
                                      markAttendance.variables?.appointmentId === apt.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <>
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Did not appear
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                                {!canMark && !isMarked && (
                                  <p className="text-xs text-muted-foreground shrink-0">
                                    Mark after slot time
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
