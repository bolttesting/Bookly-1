import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, CalendarIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const cancelServiceSchema = z.object({
  cancelled_date: z.date({ required_error: 'Please select a cancellation date' }),
  cancellation_reason: z.string().optional(),
  reschedule_deadline: z.date().optional(),
  notify_customers: z.boolean().default(true),
});

type CancelServiceFormValues = z.infer<typeof cancelServiceSchema>;

interface CancelServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    name: string;
    business_id: string;
  };
}

export function CancelServiceDialog({
  open,
  onOpenChange,
  service,
}: CancelServiceDialogProps) {
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);

  const form = useForm<CancelServiceFormValues>({
    resolver: zodResolver(cancelServiceSchema),
    defaultValues: {
      cancelled_date: new Date(),
      cancellation_reason: '',
      reschedule_deadline: undefined,
      notify_customers: true,
    },
  });

  const handleCancel = async (values: CancelServiceFormValues) => {
    setIsCancelling(true);
    try {
      // Fetch business name first
      const { data: businessData } = await supabase
        .from('businesses')
        .select('name, slug')
        .eq('id', service.business_id)
        .single();

      // Call the database function to cancel all appointments
      const { data: result, error } = await supabase.rpc('cancel_service_appointments', {
        p_service_id: service.id,
        p_cancelled_date: format(values.cancelled_date, 'yyyy-MM-dd'),
        p_cancellation_reason: values.cancellation_reason || null,
        p_reschedule_deadline: values.reschedule_deadline ? format(values.reschedule_deadline, 'yyyy-MM-dd') : null,
        p_notify_customers: values.notify_customers,
      });

      if (error) throw error;

      // Get list of cancelled appointments to send emails
      const cancelledDateStart = new Date(values.cancelled_date);
      cancelledDateStart.setHours(0, 0, 0, 0);
      
      const { data: cancelledAppointments } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          customer:customers(id, name, email),
          service:services(name)
        `)
        .eq('service_id', service.id)
        .eq('status', 'cancelled')
        .gte('start_time', cancelledDateStart.toISOString());

      // Send reschedule emails if notifications are enabled
      if (values.notify_customers && cancelledAppointments && cancelledAppointments.length > 0) {
        let emailCount = 0;
        let emailErrors = 0;
        
        for (const appointment of cancelledAppointments) {
          const customer = appointment.customer as any;
          const serviceData = appointment.service as any;
          
          if (customer?.email) {
            try {
              const bookingUrl = businessData?.slug 
                ? `${window.location.origin}/book/${businessData.slug}`
                : null;

              await supabase.functions.invoke('send-reschedule-email', {
                body: {
                  business_id: service.business_id,
                  customerEmail: customer.email,
                  customerName: customer.name,
                  serviceName: serviceData?.name || service.name,
                  businessName: businessData?.name || 'Business',
                  oldAppointmentDate: format(new Date(appointment.start_time), 'MMMM d, yyyy'),
                  oldAppointmentTime: format(new Date(appointment.start_time), 'h:mm a'),
                  newAppointmentDate: null, // Service cancelled, no new date
                  newAppointmentTime: null,
                  cancellationReason: values.cancellation_reason || 'Service has been cancelled',
                  rescheduleDeadline: values.reschedule_deadline ? format(values.reschedule_deadline, 'MMMM d, yyyy') : null,
                  bookingUrl: bookingUrl,
                },
              });
              emailCount++;
            } catch (emailError) {
              console.error('Error sending cancellation email:', emailError);
              emailErrors++;
            }
          }
        }
        
        if (emailCount > 0) {
          toast.success(`Cancelled service and sent ${emailCount} notification email${emailCount !== 1 ? 's' : ''}`);
        }
        if (emailErrors > 0) {
          toast.warning(`Failed to send ${emailErrors} notification email${emailErrors !== 1 ? 's' : ''}`);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      const cancelledCount = result?.cancelled_appointments || 0;
      toast.success(`Service "${service.name}" cancelled. ${cancelledCount} appointment${cancelledCount !== 1 ? 's' : ''} cancelled.`);
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error cancelling service:', error);
      toast.error(error.message || 'Failed to cancel service');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px] glass-card max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Service: {service.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel all future appointments for this service and notify affected customers.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCancel)} className="space-y-4">
            <FormField
              control={form.control}
              name="cancelled_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Cancellation Date *</FormLabel>
                  <FormDescription>
                    All appointments on or after this date will be cancelled
                  </FormDescription>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cancellation_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormDescription>
                    This reason will be included in customer notifications
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Service temporarily unavailable, maintenance required..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reschedule_deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Reschedule Deadline (Optional)</FormLabel>
                  <FormDescription>
                    Customers must reschedule before this date
                  </FormDescription>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a deadline (optional)</span>
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
                        disabled={(date) => date < form.watch('cancelled_date')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notify_customers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Notify Customers</FormLabel>
                    <FormDescription>
                      Send reschedule emails to all affected customers
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                disabled={isCancelling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Service'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

