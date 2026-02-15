import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { Plus, ChevronLeft, ChevronRight, Loader2, CalendarDays, Edit, Trash2, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAppointments, Appointment, AppointmentFormData } from '@/hooks/useAppointments';
import { AppointmentDialog } from '@/components/appointments/AppointmentDialog';
import { DeleteAppointmentDialog } from '@/components/appointments/DeleteAppointmentDialog';
import { RescheduleRequestsPanel } from '@/components/appointments/RescheduleRequestsPanel';
import { RecurringSeriesManager } from '@/components/recurring/RecurringSeriesManager';
import { BlockSlotDialog } from '@/components/services/BlockSlotDialog';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week">("week");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockSlotDialogOpen, setBlockSlotDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  const { appointments, isLoading, createAppointment, updateAppointment, deleteAppointment } = useAppointments({
    start: weekStart,
    end: weekEnd,
  });

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const today = new Date();

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.start_time);
      return isSameDay(aptDate, date) && aptDate.getHours() === hour;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-primary';
      case 'pending':
        return 'bg-warning';
      case 'completed':
        return 'bg-success';
      case 'cancelled':
        return 'bg-muted';
      default:
        return 'bg-primary';
    }
  };

  const handleAddAppointment = (date?: Date) => {
    setSelectedAppointment(null);
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setSelectedDate(undefined);
    setDialogOpen(true);
  };

  const handleDeleteAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: AppointmentFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedAppointment) {
        await updateAppointment.mutateAsync({ id: selectedAppointment.id, ...data });
      } else {
        await createAppointment.mutateAsync(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAppointment) return;
    setIsSubmitting(true);
    try {
      await deleteAppointment.mutateAsync(selectedAppointment.id);
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Calendar</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your appointments and schedule
          </p>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => setBlockSlotDialogOpen(true)}>
            Block Slot
          </Button>
          <Button className="animated-gradient text-primary-foreground" onClick={() => handleAddAppointment()}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Reschedule Requests */}
      <RescheduleRequestsPanel />

      {/* Tabs for Calendar and Recurring Series */}
      <Tabs defaultValue="calendar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            Recurring Series
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Calendar Controls */}
      <div className="glass-card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() - 7);
                setCurrentDate(newDate);
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-base sm:text-lg font-semibold min-w-[150px] sm:min-w-[200px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setDate(newDate.getDate() + 7);
                setCurrentDate(newDate);
              }}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
            {(["day", "week"] as const).map((v) => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                onClick={() => setView(v)}
                className={cn(
                  "capitalize",
                  view === v && "bg-primary text-primary-foreground"
                )}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid - one horizontal scroll so all 7 days show on mobile */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <div className="min-w-[600px]">
            {/* Day Headers - date/day clear on mobile */}
            <div className="grid grid-cols-8 border-b border-border">
              <div className="p-2 sm:p-3 border-r border-border hidden sm:block sticky left-0 z-10 bg-inherit" />
              <div className="p-2 sm:p-3 border-r border-border sm:hidden sticky left-0 z-10 bg-inherit" />
              {weekDates.map((date, index) => {
                const isToday = isSameDay(date, today);
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-2 sm:p-3 text-center border-r border-border last:border-r-0 cursor-pointer hover:bg-secondary/50 transition-colors min-w-[72px]",
                      isToday && "bg-primary/10"
                    )}
                    onClick={() => handleAddAppointment(date)}
                  >
                    <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-tight">
                      {daysOfWeek[date.getDay()]}
                    </div>
                    <div
                      className={cn(
                        "text-sm sm:text-lg font-semibold mt-0.5 sm:mt-1",
                        isToday && "text-primary"
                      )}
                    >
                      {date.getDate()}
                    </div>
                    <div className="text-[10px] sm:hidden text-muted-foreground/80 mt-0.5">
                      {format(date, 'MMM')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid - sticky time column on mobile so date context stays visible */}
            <div className="max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto scrollbar-thin">
              {hours.map((hour) => (
                <div key={hour} className="grid grid-cols-8 border-b border-border last:border-b-0">
              <div className="p-2 sm:p-3 text-xs text-muted-foreground border-r border-border hidden sm:block sticky left-0 z-10 bg-background shrink-0 w-14">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              <div className="p-2 sm:p-3 text-xs text-muted-foreground border-r border-border sm:hidden sticky left-0 z-10 bg-background shrink-0 w-10">
                {format(new Date().setHours(hour, 0), 'h a')}
              </div>
              {weekDates.map((date, dayIndex) => {
                const slotAppointments = getAppointmentsForSlot(date, hour);
                return (
                  <div
                    key={dayIndex}
                    className="p-1 sm:p-2 min-h-[48px] sm:min-h-[64px] border-r border-border last:border-r-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (slotAppointments.length === 0) {
                        const newDate = new Date(date);
                        newDate.setHours(hour, 0, 0, 0);
                        handleAddAppointment(newDate);
                      }
                    }}
                  >
                    {slotAppointments.map((appointment) => {
                      const aptStart = parseISO(appointment.start_time);
                      return (
                      <DropdownMenu key={appointment.id}>
                        <DropdownMenuTrigger asChild>
                          <div
                            className={cn(
                              "rounded-lg p-2 text-xs cursor-pointer hover:opacity-90 transition-opacity",
                              getStatusColor(appointment.status),
                              "text-primary-foreground"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="font-medium truncate">
                              {appointment.service?.name || 'Service'}
                            </div>
                            <div className="opacity-80 truncate">
                              {appointment.customer?.name || 'Customer'}
                            </div>
                            {/* Date + time together so it's clear which day the booking is on (helps mobile) */}
                            <div className="opacity-90 mt-1 flex flex-col sm:block gap-0.5">
                              <span className="sm:hidden font-medium">
                                {format(aptStart, 'EEE d MMM')}
                              </span>
                              <span>
                                {format(aptStart, 'h:mm a')}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="glass-card">
                          <DropdownMenuItem onClick={() => handleEditAppointment(appointment)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteAppointment(appointment)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );})}
                  </div>
                );
              })}
            </div>
          ))}
            </div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {appointments.length === 0 && (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No appointments this week</h3>
          <p className="text-muted-foreground mb-4">
            Get started by booking your first appointment.
          </p>
          <Button onClick={() => handleAddAppointment()}>
            <Plus className="h-4 w-4 mr-2" />
            New Appointment
          </Button>
        </div>
      )}
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <RecurringSeriesManager />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        appointment={selectedAppointment}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        defaultDate={selectedDate}
      />

      <DeleteAppointmentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        customerName={selectedAppointment?.customer?.name || ''}
        serviceName={selectedAppointment?.service?.name || ''}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
      />

      <BlockSlotDialog
        open={blockSlotDialogOpen}
        onOpenChange={setBlockSlotDialogOpen}
      />
    </div>
  );
};

export default Calendar;
