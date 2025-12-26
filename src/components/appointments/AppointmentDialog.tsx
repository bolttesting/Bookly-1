import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMinutes } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarIcon, X, CalendarClock, AlertCircle, Repeat } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Appointment, AppointmentFormData, useAppointments } from '@/hooks/useAppointments';
import { useServices } from '@/hooks/useServices';
import { useStaff } from '@/hooks/useStaff';
import { useCustomers } from '@/hooks/useCustomers';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CreditCard, DollarSign } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';
import { useBusiness } from '@/hooks/useBusiness';
import { useRecurringAppointments } from '@/hooks/useRecurringAppointments';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const appointmentSchema = z.object({
  customer_id: z.string().min(1, 'Please select a customer'),
  service_id: z.string().min(1, 'Please select a service'),
  staff_id: z.string().optional(),
  date: z.date({ required_error: 'Please select a date' }),
  time: z.string().min(1, 'Please select a time'),
  status: z.enum(['confirmed', 'pending', 'cancelled', 'completed']),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minutes = i % 2 === 0 ? '00' : '30';
  if (hour > 20) return null;
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
}).filter(Boolean) as string[];

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  isLoading: boolean;
  defaultDate?: Date;
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSubmit,
  isLoading,
  defaultDate,
}: AppointmentDialogProps) {
  const isEditing = !!appointment;
  const { services } = useServices();
  const { staff } = useStaff();
  const { customers } = useCustomers();
  const { business } = useBusiness();
  const { markPaymentReceived, deleteAppointment } = useAppointments();
  const { createSeries } = useRecurringAppointments();
  const [selectedServiceDuration, setSelectedServiceDuration] = useState(60);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [originalDate, setOriginalDate] = useState<Date | null>(null);
  const [originalTime, setOriginalTime] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'weekly' | 'monthly'>('weekly');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);
  const [recurrenceMaxOccurrences, setRecurrenceMaxOccurrences] = useState<number | null>(null);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'occurrences'>('never');

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customer_id: '',
      service_id: '',
      staff_id: '',
      date: defaultDate || new Date(),
      time: '09:00',
      status: 'confirmed',
      notes: '',
    },
  });

  const watchedServiceId = form.watch('service_id');

  useEffect(() => {
    if (watchedServiceId) {
      const service = services.find((s) => s.id === watchedServiceId);
      if (service) {
        setSelectedServiceDuration(service.duration);
      }
    }
  }, [watchedServiceId, services]);

  useEffect(() => {
    if (appointment) {
      const startDate = new Date(appointment.start_time);
      form.reset({
        customer_id: appointment.customer_id,
        service_id: appointment.service_id,
        staff_id: appointment.staff_id || '',
        date: startDate,
        time: format(startDate, 'HH:mm'),
        status: appointment.status as 'confirmed' | 'pending' | 'cancelled' | 'completed',
        notes: appointment.notes || '',
      });
      // Store original date/time to detect reschedule
      setOriginalDate(startDate);
      setOriginalTime(format(startDate, 'HH:mm'));
    } else {
      form.reset({
        customer_id: '',
        service_id: '',
        staff_id: '',
        date: defaultDate || new Date(),
        time: '09:00',
        status: 'confirmed',
        notes: '',
      });
      setOriginalDate(null);
      setOriginalTime(null);
    }
  }, [appointment, form, defaultDate]);

  // Check if date/time changed (reschedule)
  const currentDate = form.watch('date');
  const currentTime = form.watch('time');
  const isRescheduling = isEditing && originalDate && originalTime && (
    currentDate.getTime() !== originalDate.getTime() ||
    currentTime !== originalTime
  );

  const handleSubmit = async (values: AppointmentFormValues) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    const startTime = new Date(values.date);
    startTime.setHours(hours, minutes, 0, 0);
    const endTime = addMinutes(startTime, selectedServiceDuration);

    const service = services.find((s) => s.id === values.service_id);

    // If recurring, create a series instead
    if (isRecurring && !isEditing) {
      await createSeries.mutateAsync({
        customer_id: values.customer_id,
        service_id: values.service_id,
        staff_id: values.staff_id || null,
        recurrence_pattern: recurrencePattern,
        recurrence_frequency: recurrenceFrequency,
        start_date: values.date,
        end_date: recurrenceEndType === 'date' ? recurrenceEndDate : null,
        max_occurrences: recurrenceEndType === 'occurrences' ? recurrenceMaxOccurrences : null,
        time_of_day: values.time,
        notes: values.notes,
        price: service ? Number(service.price) : null,
        generate_initial_appointments: true,
      });
      onOpenChange(false);
      return;
    }

    // Regular single appointment
    await onSubmit({
      customer_id: values.customer_id,
      service_id: values.service_id,
      staff_id: values.staff_id || undefined,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: values.status,
      notes: values.notes,
      price: service ? Number(service.price) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Make changes to the appointment.'
              : 'Book a new appointment for a customer.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.filter((s) => s.status === 'active').map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration} min - ${service.price})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="staff_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} 
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      {staff.filter((s) => s.status !== 'off').map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} {member.role ? `(${member.role})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              {isRescheduling && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Rescheduling Appointment
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Changing the date or time will send a reschedule email to the customer.
                    </p>
                    {originalDate && originalTime && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Original: {format(originalDate, 'MMM d, yyyy')} at {format(new Date(`2000-01-01T${originalTime}`), 'h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground',
                                isRescheduling && 'border-blue-500'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                          <SelectTrigger className={isRescheduling ? 'border-blue-500' : ''}>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring Appointment Options (only for new appointments) */}
            {!isEditing && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Recurring Appointment</span>
                    </div>
                    <Switch
                      checked={isRecurring}
                      onCheckedChange={setIsRecurring}
                    />
                  </div>
                  
                  {isRecurring && (
                    <Collapsible open={isRecurring} className="space-y-4">
                      <CollapsibleContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Pattern</label>
                            <Select
                              value={recurrencePattern}
                              onValueChange={(value: 'weekly' | 'monthly') => setRecurrencePattern(value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">
                              Every {recurrencePattern === 'weekly' ? 'Week(s)' : 'Month(s)'}
                            </label>
                            <Input
                              type="number"
                              min="1"
                              value={recurrenceFrequency}
                              onChange={(e) => setRecurrenceFrequency(parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">End Date</label>
                          <Select
                            value={recurrenceEndType}
                            onValueChange={(value: 'never' | 'date' | 'occurrences') => setRecurrenceEndType(value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="never">Never</SelectItem>
                              <SelectItem value="date">On Date</SelectItem>
                              <SelectItem value="occurrences">After Occurrences</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {recurrenceEndType === 'date' && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !recurrenceEndDate && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {recurrenceEndDate ? (
                                  format(recurrenceEndDate, 'PPP')
                                ) : (
                                  <span>Pick an end date</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={recurrenceEndDate || undefined}
                                onSelect={(date) => setRecurrenceEndDate(date || null)}
                                disabled={(date) => date < form.watch('date')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        )}
                        
                        {recurrenceEndType === 'occurrences' && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Number of Occurrences</label>
                            <Input
                              type="number"
                              min="1"
                              value={recurrenceMaxOccurrences || ''}
                              onChange={(e) => setRecurrenceMaxOccurrences(parseInt(e.target.value) || null)}
                              placeholder="e.g., 10"
                            />
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special requests or notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Status Section (when editing) */}
            {isEditing && appointment && appointment.price && appointment.price > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Payment Status</span>
                    </div>
                    <Badge 
                      variant={
                        appointment.payment_status === 'paid' ? 'default' :
                        appointment.payment_status === 'partial' ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {appointment.payment_status === 'paid' ? 'Paid' :
                       appointment.payment_status === 'partial' ? 'Partial' :
                       'Pending'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-medium">
                      {formatCurrencySimple(appointment.price, business?.currency || 'USD')}
                    </span>
                  </div>
                  {(appointment.payment_status === 'pending' || appointment.payment_status === 'partial') && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setPaymentAmount(appointment.price?.toString() || '');
                        setShowPaymentDialog(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Mark Payment Received
                    </Button>
                  )}
                </div>
              </>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || createSeries.isPending}>
                {(isLoading || createSeries.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Saving...' : isRecurring ? 'Creating Series...' : 'Booking...'}
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : isRecurring ? (
                  'Create Recurring Series'
                ) : (
                  'Book Appointment'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Payment Collection Dialog - Separate Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment received for this appointment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {appointment && (
                <p className="text-xs text-muted-foreground">
                  Total: {formatCurrencySimple(appointment.price || 0, business?.currency || 'USD')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!appointment) return;
                const amount = parseFloat(paymentAmount);
                if (!amount || amount <= 0) {
                  return;
                }
                try {
                  await markPaymentReceived.mutateAsync({
                    appointmentId: appointment.id,
                    amount,
                    paymentMethod,
                  });
                  setShowPaymentDialog(false);
                  setPaymentAmount('');
                } catch (error) {
                  // Error handled by mutation
                }
              }}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || !appointment}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Appointment Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? 
              {appointment?.customer && appointment?.service && (
                <>
                  {' '}This will cancel the <strong>{appointment.service.name}</strong> appointment for{' '}
                  <strong>{appointment.customer.name}</strong>.
                </>
              )}
              {appointment?.customer?.email && (
                <span className="block mt-2 text-sm">
                  A cancellation email will be sent to {appointment.customer.email}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Keep Appointment</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                if (!appointment) return;
                try {
                  await deleteAppointment.mutateAsync(appointment.id);
                  setShowCancelDialog(false);
                  onOpenChange(false);
                } catch (error) {
                  // Error handled by mutation
                }
              }}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Appointment'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
