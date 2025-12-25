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
import { Coupon, CouponFormData } from '@/hooks/useCoupons';
import { useCurrency } from '@/hooks/useCurrency';

const couponSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(50, 'Code is too long'),
  name: z.string().max(100, 'Name is too long').optional(),
  description: z.string().max(500, 'Description is too long').optional(),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.coerce.number().min(0.01, 'Discount value must be greater than 0'),
  min_purchase_amount: z.coerce.number().min(0, 'Cannot be negative').optional(),
  max_discount_amount: z.coerce.number().min(0, 'Cannot be negative').optional(),
  usage_limit: z.coerce.number().min(1, 'Must be at least 1').optional(),
  valid_from: z.string().min(1, 'Valid from date is required'),
  valid_until: z.string().optional(),
  applicable_to: z.enum(['all', 'services', 'packages']),
  status: z.enum(['active', 'inactive']),
  service_ids: z.array(z.string()).optional(),
  package_ids: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.discount_type === 'percentage' && data.discount_value > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discount_value'],
}).refine((data) => {
  if (data.applicable_to === 'services' && (!data.service_ids || data.service_ids.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Select at least one service',
  path: ['service_ids'],
}).refine((data) => {
  if (data.applicable_to === 'packages' && (!data.package_ids || data.package_ids.length === 0)) {
    return false;
  }
  return true;
}, {
  message: 'Select at least one package',
  path: ['package_ids'],
});

type CouponFormValues = z.infer<typeof couponSchema>;

interface CouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: Coupon | null;
  services: { id: string; name: string }[];
  packages: { id: string; name: string }[];
  onSubmit: (data: CouponFormData) => Promise<void>;
  isLoading: boolean;
}

export function CouponDialog({
  open,
  onOpenChange,
  coupon,
  services,
  packages,
  onSubmit,
  isLoading,
}: CouponDialogProps) {
  const isEditing = !!coupon;
  const { format } = useCurrency();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_purchase_amount: 0,
      max_discount_amount: undefined,
      usage_limit: undefined,
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: undefined,
      applicable_to: 'all',
      status: 'active',
      service_ids: [],
      package_ids: [],
    },
  });

  useEffect(() => {
    if (coupon) {
      form.reset({
        code: coupon.code,
        name: coupon.name || '',
        description: coupon.description || '',
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        min_purchase_amount: coupon.min_purchase_amount ? Number(coupon.min_purchase_amount) : undefined,
        max_discount_amount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : undefined,
        usage_limit: coupon.usage_limit ? Number(coupon.usage_limit) : undefined,
        valid_from: new Date(coupon.valid_from).toISOString().split('T')[0],
        valid_until: coupon.valid_until ? new Date(coupon.valid_until).toISOString().split('T')[0] : undefined,
        applicable_to: coupon.applicable_to,
        status: coupon.status,
        service_ids: coupon.applicable_services?.map(s => s.id) || [],
        package_ids: coupon.applicable_packages?.map(p => p.id) || [],
      });
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 10,
        min_purchase_amount: 0,
        max_discount_amount: undefined,
        usage_limit: undefined,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: undefined,
        applicable_to: 'all',
        status: 'active',
        service_ids: [],
        package_ids: [],
      });
    }
  }, [coupon, form]);

  const handleSubmit = async (values: CouponFormValues) => {
    await onSubmit({
      ...values,
      valid_from: new Date(values.valid_from).toISOString(),
      valid_until: values.valid_until ? new Date(values.valid_until).toISOString() : undefined,
    });
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const discountType = form.watch('discount_type');
  const applicableTo = form.watch('applicable_to');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update coupon details and settings.'
              : 'Create a new coupon code for customers to use.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Code *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SAVE20" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription>Will be converted to uppercase</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coupon Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Sale" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this coupon..."
                      rows={2}
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
                name="discount_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Discount Value * 
                      {discountType === 'percentage' ? ' (%)' : ` (${format(0).replace(/[\d.,]/g, '')})`}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step={discountType === 'percentage' ? '1' : '0.01'}
                        min="0.01"
                        max={discountType === 'percentage' ? '100' : undefined}
                        placeholder={discountType === 'percentage' ? '10' : '50.00'}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {discountType === 'percentage' 
                        ? 'Percentage off (e.g., 20 = 20% off)'
                        : 'Fixed amount off'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_purchase_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Purchase</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Minimum order amount to use coupon</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {discountType === 'percentage' && (
                <FormField
                  control={form.control}
                  name="max_discount_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Discount Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="No limit"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Maximum discount (for percentage coupons)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="usage_limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usage Limit</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        placeholder="Unlimited"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Maximum times coupon can be used</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applicable_to"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable To *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Services & Packages</SelectItem>
                        <SelectItem value="services">Specific Services</SelectItem>
                        <SelectItem value="packages">Specific Packages</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {applicableTo === 'services' && (
              <FormField
                control={form.control}
                name="service_ids"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Select Services *</FormLabel>
                      <FormDescription>
                        Choose which services this coupon applies to
                      </FormDescription>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
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
                                        ? field.onChange([...field.value || [], service.id])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== service.id) || []
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {applicableTo === 'packages' && (
              <FormField
                control={form.control}
                name="package_ids"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Select Packages *</FormLabel>
                      <FormDescription>
                        Choose which packages this coupon applies to
                      </FormDescription>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {packages.map((pkg) => (
                        <FormField
                          key={pkg.id}
                          control={form.control}
                          name="package_ids"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={pkg.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(pkg.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value || [], pkg.id])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== pkg.id) || []
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{pkg.name}</FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value || undefined)}
                      />
                    </FormControl>
                    <FormDescription>Leave empty for no expiration</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  isEditing ? 'Update Coupon' : 'Create Coupon'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

