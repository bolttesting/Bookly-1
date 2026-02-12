import { useState } from 'react';
import { Plus, Search, Clock, DollarSign, Edit, Trash2, MoreVertical, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useServices, Service, ServiceFormData } from '@/hooks/useServices';
import { useCurrency } from '@/hooks/useCurrency';
import { ServiceDialog } from '@/components/services/ServiceDialog';
import { DeleteServiceDialog } from '@/components/services/DeleteServiceDialog';
import { CancelServiceDialog } from '@/components/services/CancelServiceDialog';
import { BlockSlotDialog } from '@/components/services/BlockSlotDialog';

const Services = () => {
  const { services, isLoading, createService, updateService, deleteService } = useServices();
  const { format } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [blockSlotDialogOpen, setBlockSlotDialogOpen] = useState(false);
  const [blockSlotService, setBlockSlotService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddService = () => {
    setSelectedService(null);
    setDialogOpen(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const handleDeleteService = (service: Service) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const handleCancelService = (service: Service) => {
    setSelectedService(service);
    setCancelDialogOpen(true);
  };

  const handleBlockSlot = (service: Service) => {
    setBlockSlotService(service);
    setBlockSlotDialogOpen(true);
  };

  const handleSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedService) {
        await updateService.mutateAsync({ id: selectedService.id, ...data });
      } else {
        await createService.mutateAsync(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      await deleteService.mutateAsync(selectedService.id);
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
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Services</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your services and pricing
          </p>
        </div>
        <Button className="animated-gradient text-primary-foreground shrink-0 w-full sm:w-auto" onClick={handleAddService}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      {/* Search */}
      <div className="glass-card p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? 'No services found' : 'No services yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Get started by adding your first service.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddService}>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="glass-card p-4 sm:p-5 hover-lift group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{service.name}</h3>
                    <Badge
                      variant={service.status === "active" ? "default" : "secondary"}
                      className={
                        service.status === "active"
                          ? "bg-success/20 text-success border-success/30"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {service.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {service.description || 'No description'}
                  </p>
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
                    <DropdownMenuItem onClick={() => handleEditService(service)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-orange-600 dark:text-orange-400"
                      onClick={() => handleCancelService(service)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Service
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBlockSlot(service)}>
                      Block Slot
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteService(service)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{service.duration} min</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{Number(service.price) === 0 ? "Free" : format(Number(service.price))}</span>
                </div>
              </div>

              {service.category && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Badge variant="outline" className="text-xs">
                    {service.category}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={selectedService}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      <DeleteServiceDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        serviceName={selectedService?.name || ''}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
      />

      {selectedService && (
        <CancelServiceDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          service={{
            id: selectedService.id,
            name: selectedService.name,
            business_id: selectedService.business_id,
          }}
        />
      )}

      <BlockSlotDialog
        open={blockSlotDialogOpen}
        onOpenChange={(open) => {
          setBlockSlotDialogOpen(open);
          if (!open) setBlockSlotService(null);
        }}
        defaultServiceId={blockSlotService?.id}
      />
    </div>
  );
};

export default Services;
