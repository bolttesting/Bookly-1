import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormDescription,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Service, ServiceFormData } from '@/hooks/useServices';

const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  duration: z.coerce.number().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours'),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  category: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  buffer_time: z.coerce.number().min(0, 'Buffer time cannot be negative').max(120, 'Buffer time cannot exceed 2 hours'),
  slot_capacity: z.coerce.number().min(1, 'Must have at least 1 slot').max(100, 'Cannot exceed 100 slots'),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const categories = [
  'General',
  'Wellness',
  'Fitness',
  'Beauty',
  'Massage',
  'Consultation',
  'Medical',
  'Other',
];

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  isLoading: boolean;
}

export function ServiceDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
  isLoading,
}: ServiceDialogProps) {
  const isEditing = !!service;

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      duration: 60,
      price: 0,
      category: '',
      status: 'active',
      buffer_time: 0,
      slot_capacity: 1,
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        description: service.description || '',
        duration: service.duration,
        price: Number(service.price),
        category: service.category || '',
        status: service.status as 'active' | 'inactive',
        buffer_time: service.buffer_time || 0,
        slot_capacity: service.slot_capacity || 1,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        duration: 60,
        price: 0,
        category: '',
        status: 'active',
        buffer_time: 0,
        slot_capacity: 1,
      });
    }
  }, [service, form]);

  const handleSubmit = async (values: ServiceFormValues) => {
    await onSubmit({
      name: values.name,
      description: values.description,
      duration: values.duration,
      price: values.price,
      category: values.category,
      status: values.status,
      buffer_time: values.buffer_time,
      slot_capacity: values.slot_capacity,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] glass-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEditing ? 'Edit Service' : 'Add New Service'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Make changes to your service here.'
              : 'Create a new service for your business.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Deep Tissue Massage" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your service..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} step={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="buffer_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Buffer Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={5} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Time between appointments
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={0.01} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Payment settings (advance/on-spot/partial) are configured in Settings → Payments
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slot_capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slot Capacity</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={100} {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Bookings per time slot (e.g., yoga class)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
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
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Saving...' : 'Creating...'}
                  </>
                ) : isEditing ? (
                  'Save Changes'
                ) : (
                  'Create Service'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
