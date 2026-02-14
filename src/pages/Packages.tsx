import { useState } from 'react';
import { Plus, Search, Calendar, DollarSign, Edit, Trash2, MoreVertical, Loader2, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePackages, PackageTemplate } from '@/hooks/usePackages';
import { useCurrency } from '@/hooks/useCurrency';
import { PackageDialog } from '@/components/packages/PackageDialog';
import { DeletePackageDialog } from '@/components/packages/DeletePackageDialog';
import { ImageSlideshow } from '@/components/ImageSlideshow';

const Packages = () => {
  const { packages, services, isLoading, createPackage, updatePackage, deletePackage } = usePackages();
  const { format } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPackage = () => {
    setSelectedPackage(null);
    setDialogOpen(true);
  };

  const handleEditPackage = (pkg: PackageTemplate) => {
    setSelectedPackage(pkg);
    setDialogOpen(true);
  };

  const handleDeletePackage = (pkg: PackageTemplate) => {
    setSelectedPackage(pkg);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (selectedPackage) {
        await updatePackage.mutateAsync({ id: selectedPackage.id, ...data });
      } else {
        await createPackage.mutateAsync(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPackage) return;
    setIsSubmitting(true);
    try {
      await deletePackage.mutateAsync(selectedPackage.id);
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (pkg: PackageTemplate) => {
    const value = pkg.duration_value ?? 0;
    const type = pkg.duration_type ?? 'month';
    const plural = value !== 1 ? 's' : '';
    return `${value} ${type}${plural}`;
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
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Packages</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Create packages with multiple services, booking limits, and time restrictions
          </p>
        </div>
        <Button className="animated-gradient text-primary-foreground shrink-0 w-full sm:w-auto" onClick={handleAddPackage}>
          <Plus className="h-4 w-4 mr-2" />
          Create Package
        </Button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search packages..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Packages Grid */}
      {filteredPackages.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? 'No packages found' : 'No packages yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first package to offer bundled services to customers.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddPackage}>
              <Plus className="h-4 w-4 mr-2" />
              Create Package
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="glass-card overflow-hidden p-0 hover-lift group min-w-0"
            >
              <ImageSlideshow
                imageUrls={pkg.image_urls}
                alt={pkg.name}
                className="rounded-t-lg"
              />
              <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{pkg.name}</h3>
                    <Badge
                      variant={pkg.status === "active" ? "default" : "secondary"}
                      className={
                        pkg.status === "active"
                          ? "bg-success/20 text-success border-success/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {pkg.status}
                    </Badge>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {pkg.description}
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
                    <DropdownMenuItem onClick={() => handleEditPackage(pkg)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeletePackage(pkg)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-lg font-bold text-primary whitespace-nowrap">
                      {pkg.price != null && !Number.isNaN(Number(pkg.price)) ? format(Number(pkg.price)) : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>
                      {pkg.booking_limit != null && !Number.isNaN(Number(pkg.booking_limit))
                        ? `${pkg.booking_limit} booking${Number(pkg.booking_limit) !== 1 ? 's' : ''}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{formatDuration(pkg)}</span>
                  </div>
                </div>

                {pkg.services && pkg.services.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Includes:</p>
                    <div className="flex flex-wrap gap-1">
                      {(pkg.services as { id: string; name: string }[]).slice(0, 3).map((service) => (
                        <Badge key={service.id} variant="outline" className="text-xs">
                          {service.name}
                        </Badge>
                      ))}
                      {pkg.services.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{pkg.services.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <PackageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        package={selectedPackage}
        services={services}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      <DeletePackageDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        packageName={selectedPackage?.name || ''}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Packages;

