import { useState, useEffect } from 'react';
import { format, addMinutes, differenceInHours } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarIcon, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRescheduleRequests } from '@/hooks/useRescheduleRequests';
import { useBusiness } from '@/hooks/useBusiness';
import { useAvailableSlots } from '@/hooks/useAvailableSlots';
import { toast } from 'sonner';

interface RescheduleRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    start_time: string;
    end_time: string;
    business_id: string;
    service_id: string;
    location_id?: string | null;
    service?: { name: string; duration: number; buffer_time?: number; slot_capacity?: number } | null;
  };
  rescheduleDeadlineHours?: number | null;
}

export function RescheduleRequestDialog({
  open,
  onOpenChange,
  appointment,
  rescheduleDeadlineHours,
}: RescheduleRequestDialogProps) {
  const { createRequest } = useRescheduleRequests();
  // Only use useBusiness as fallback for deadline hours if not provided as prop
  const { business } = useBusiness();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const serviceDuration = appointment.service?.duration || 60;
  const oldStartTime = new Date(appointment.start_time);
  const oldEndTime = new Date(appointment.end_time);
  
  // Check if deadline has passed - use prop if provided, otherwise fall back to business hook
  const deadlineHours = rescheduleDeadlineHours ?? business?.reschedule_deadline_hours ?? 24;
  const now = new Date();
  const hoursUntilAppointment = differenceInHours(oldStartTime, now);
  const isDeadlinePassed = deadlineHours > 0 && hoursUntilAppointment < deadlineHours;

  // Fetch available slots for the selected date (only available times for this service)
  const { slots: timeSlots, isLoading: slotsLoading, offDays } = useAvailableSlots({
    businessId: appointment.business_id,
    serviceId: appointment.service_id,
    service: {
      duration: appointment.service?.duration || 60,
      buffer_time: appointment.service?.buffer_time ?? 0,
      slot_capacity: appointment.service?.slot_capacity ?? 1,
    },
    locationId: appointment.location_id ?? null,
    selectedDate,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(undefined);
      setSelectedTime('');
      setReason('');
      setCalendarOpen(false);
    }
  }, [open]);

  // Clear selected time when date changes or when selected time is no longer available
  useEffect(() => {
    if (selectedTime && timeSlots.length > 0 && !timeSlots.includes(selectedTime)) {
      setSelectedTime('');
    }
  }, [selectedDate, timeSlots, selectedTime]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      return;
    }

    // Check deadline before submitting
    if (isDeadlinePassed) {
      toast.error(
        `Reschedule requests must be made at least ${deadlineHours} hours before the appointment. The deadline has passed.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse selected time
      const [time, period] = selectedTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;

      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(hour24, minutes, 0, 0);
      const newEndTime = addMinutes(newStartTime, serviceDuration);

      await createRequest.mutateAsync({
        appointmentId: appointment.id,
        newStartTime: newStartTime.toISOString(),
        newEndTime: newEndTime.toISOString(),
        reason: reason || undefined,
      });

      // Reset form
      setSelectedDate(undefined);
      setSelectedTime('');
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting reschedule request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Reschedule</DialogTitle>
          <DialogDescription>
            Request to reschedule your appointment. The business will review and notify you of their decision.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isDeadlinePassed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Reschedule requests must be made at least {deadlineHours} hours before the appointment. 
                The deadline has passed ({hoursUntilAppointment} hours remaining). 
                Please contact the business directly to reschedule.
              </AlertDescription>
            </Alert>
          )}
          
          <div>
            <Label className="text-sm text-muted-foreground">Current Appointment</Label>
            <div className="mt-1 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                {format(oldStartTime, 'EEEE, MMMM d, yyyy')} at {format(oldStartTime, 'h:mm a')}
              </p>
              {!isDeadlinePassed && deadlineHours > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Request must be submitted at least {deadlineHours} hours before appointment
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">New Date *</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedTime('');
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return true;
                    const dateStr = format(date, 'yyyy-MM-dd');
                    return offDays.includes(dateStr);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">New Time *</Label>
            <Select
              value={selectedTime}
              onValueChange={setSelectedTime}
              disabled={!selectedDate || slotsLoading}
            >
              <SelectTrigger id="time">
                {slotsLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="mr-2 h-4 w-4" />
                )}
                <SelectValue
                  placeholder={
                    !selectedDate
                      ? 'Select a date first'
                      : slotsLoading
                        ? 'Loading available slots...'
                        : timeSlots.length === 0
                          ? 'No available slots'
                          : 'Select time'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {timeSlots.length === 0 && !slotsLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No available slots for this date
                  </div>
                ) : (
                  timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Let the business know why you need to reschedule..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || isSubmitting || isDeadlinePassed}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

