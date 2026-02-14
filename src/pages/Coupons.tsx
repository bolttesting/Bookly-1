import { useState } from 'react';
import { Plus, Search, Tag, Edit, Trash2, MoreVertical, Loader2, Calendar, Users, Percent, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCoupons, Coupon } from '@/hooks/useCoupons';
import { useCurrency } from '@/hooks/useCurrency';
import { CouponDialog } from '@/components/coupons/CouponDialog';
import { DeleteCouponDialog } from '@/components/coupons/DeleteCouponDialog';
import { format } from 'date-fns';

const Coupons = () => {
  const { coupons, services, packages, isLoading, createCoupon, updateCoupon, deleteCoupon } = useCoupons();
  const { format: formatCurrency } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCoupons = coupons.filter((coupon) =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coupon.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coupon.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCoupon = () => {
    setSelectedCoupon(null);
    setDialogOpen(true);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDialogOpen(true);
  };

  const handleDeleteCoupon = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (selectedCoupon) {
        await updateCoupon.mutateAsync({ id: selectedCoupon.id, ...data });
      } else {
        await createCoupon.mutateAsync(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCoupon) return;
    setIsSubmitting(true);
    try {
      await deleteCoupon.mutateAsync(selectedCoupon.id);
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCouponExpired = (coupon: Coupon) => {
    if (!coupon.valid_until) return false;
    return new Date(coupon.valid_until) < new Date();
  };

  const isCouponActive = (coupon: Coupon) => {
    if (coupon.status !== 'active') return false;
    if (new Date(coupon.valid_from) > new Date()) return false;
    if (isCouponExpired(coupon)) return false;
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return false;
    return true;
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
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Coupons</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Create and manage discount coupons for your customers
          </p>
        </div>
        <Button className="animated-gradient text-primary-foreground shrink-0 w-full sm:w-auto" onClick={handleAddCoupon}>
          <Plus className="h-4 w-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search coupons..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Coupons Grid */}
      {filteredCoupons.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Tag className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? 'No coupons found' : 'No coupons yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first coupon to offer discounts to customers.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddCoupon}>
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCoupons.map((coupon) => {
            const expired = isCouponExpired(coupon);
            const active = isCouponActive(coupon);
            
            return (
              <div
                key={coupon.id}
                className="glass-card p-5 hover-lift group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground font-mono text-lg">{coupon.code}</h3>
                      <Badge
                        variant={active ? "default" : expired ? "destructive" : "secondary"}
                        className={
                          active
                            ? "bg-success/20 text-success border-success/30"
                            : expired
                            ? "bg-destructive/20 text-destructive border-destructive/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {active ? 'Active' : expired ? 'Expired' : coupon.status}
                      </Badge>
                    </div>
                    {coupon.name && (
                      <p className="text-sm font-medium text-foreground mb-1">{coupon.name}</p>
                    )}
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {coupon.description}
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass-card">
                      <DropdownMenuItem onClick={() => handleEditCoupon(coupon)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteCoupon(coupon)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {coupon.discount_type === 'percentage' ? (
                      <>
                        <Percent className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold text-primary">
                          {coupon.discount_value}% OFF
                        </span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(Number(coupon.discount_value))} OFF
                        </span>
                      </>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {coupon.min_purchase_amount && coupon.min_purchase_amount > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>Min: {formatCurrency(Number(coupon.min_purchase_amount))}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(coupon.valid_from), 'MMM d, yyyy')}
                        {coupon.valid_until && (
                          <> - {format(new Date(coupon.valid_until), 'MMM d, yyyy')}</>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {coupon.used_count} / {coupon.usage_limit || '∞'} used
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Applies to: {coupon.applicable_to === 'all' ? 'All' : coupon.applicable_to === 'services' ? 'Services' : 'Packages'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CouponDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        coupon={selectedCoupon}
        services={services}
        packages={packages}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      <DeleteCouponDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        couponCode={selectedCoupon?.code || ''}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Coupons;

