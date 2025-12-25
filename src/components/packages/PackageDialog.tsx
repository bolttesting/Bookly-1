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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { PackageTemplate, PackageFormData } from '@/hooks/usePackages';
import { useCurrency } from '@/hooks/useCurrency';

const packageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  booking_limit: z.coerce.number().min(1, 'Must allow at least 1 booking').max(1000, 'Cannot exceed 1000 bookings'),
  duration_type: z.enum(['days', 'weeks', 'months', 'years']),
  duration_value: z.coerce.number().min(1, 'Duration must be at least 1').max(100, 'Cannot exceed 100'),
  status: z.enum(['active', 'inactive']),
  service_ids: z.array(z.string()).min(1, 'Select at least one service'),
});

type PackageFormValues = z.infer<typeof packageSchema>;

interface PackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  package?: PackageTemplate | null;
  services: { id: string; name: string }[];
  onSubmit: (data: PackageFormData) => Promise<void>;
  isLoading: boolean;
}

export function PackageDialog({
  open,
  onOpenChange,
  package: pkg,
  services,
  onSubmit,
  isLoading,
}: PackageDialogProps) {
  const isEditing = !!pkg;
  const { format } = useCurrency();

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      booking_limit: 1,
      duration_type: 'months',
      duration_value: 1,
      status: 'active',
      service_ids: [],
    },
  });

  useEffect(() => {
    if (pkg) {
      form.reset({
        name: pkg.name,
        description: pkg.description || '',
        price: Number(pkg.price),
        booking_limit: pkg.booking_limit,
        duration_type: pkg.duration_type,
        duration_value: pkg.duration_value,
        status: pkg.status,
        service_ids: pkg.services?.map(s => s.id) || [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        price: 0,
        booking_limit: 1,
        duration_type: 'months',
        duration_value: 1,
        status: 'active',
        service_ids: [],
      });
    }
  }, [pkg, form]);

  const handleSubmit = async (values: PackageFormValues) => {
    await onSubmit(values);
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Package' : 'Create Package'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update package details and services.'
              : 'Create a new package with services, booking limits, and duration.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Pass, Annual Package" {...field} />
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
                      placeholder="Describe what's included in this package..."
                      rows={3}
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>
                      {form.watch('price') > 0 && format(Number(form.watch('price')))}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="booking_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Limit *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="1000" placeholder="10" {...field} />
                    </FormControl>
                    <FormDescription>Number of bookings allowed</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                        <SelectItem value="years">Years</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration Value *</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="100" placeholder="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Package valid for {form.watch('duration_value')} {form.watch('duration_type')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="service_ids"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Services *</FormLabel>
                    <FormDescription>
                      Select which services are included in this package
                    </FormDescription>
                  </div>
                  {services.map((service) => (
                    <FormField
                      key={service.id}
                      control={form.control}
                      name="service_ids"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={service.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(service.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, service.id])
                                    : field.onChange(
                                        field.value?.filter((value) => value !== service.id)
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{service.name}</FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditing ? 'Update Package' : 'Create Package'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

