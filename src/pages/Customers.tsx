import { useState } from 'react';
import { Plus, Search, MoreVertical, Mail, Phone, Edit, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomers, Customer, CustomerFormData } from '@/hooks/useCustomers';
import { useBusiness } from '@/hooks/useBusiness';
import { formatCurrencySimple } from '@/lib/currency';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { DeleteCustomerDialog } from '@/components/customers/DeleteCustomerDialog';

const Customers = () => {
  const { business } = useBusiness();
  const { customers, stats, isLoading, createCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "vip":
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">
            VIP
          </Badge>
        );
      case "active":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            Active
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            Inactive
          </Badge>
        );
    }
  };

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedCustomer) {
        await updateCustomer.mutateAsync({ id: selectedCustomer.id, ...data });
      } else {
        await createCustomer.mutateAsync(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      await deleteCustomer.mutateAsync(selectedCustomer.id);
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
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Customers</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your customer database
          </p>
        </div>
        <Button className="animated-gradient text-primary-foreground shrink-0 w-full sm:w-auto" onClick={handleAddCustomer}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total Customers", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "VIP Members", value: stats.vip },
          { label: "Inactive", value: stats.inactive },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card p-3 sm:p-4">
        <div className="relative max-w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Customer Table */}
      {filteredCustomers.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? 'No customers found' : 'No customers yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Get started by adding your first customer.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddCustomer}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs sm:text-sm">Customer</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Visits</TableHead>
                  <TableHead className="text-xs sm:text-sm hidden md:table-cell">Total Spent</TableHead>
                  <TableHead className="text-xs sm:text-sm">Status</TableHead>
                  <TableHead className="w-[50px] text-xs sm:text-sm"></TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="border-border hover:bg-secondary/50"
                >
                  <TableCell className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium block truncate">{customer.name}</span>
                        {customer.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                            {customer.notes}
                          </p>
                        )}
                        <div className="sm:hidden mt-1 space-y-0.5">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                    <div className="space-y-1">
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[200px]">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </div>
                      )}
                      {!customer.email && !customer.phone && (
                        <span className="text-sm text-muted-foreground">No contact info</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden md:table-cell">{customer.total_visits}</TableCell>
                  <TableCell className="text-xs sm:text-sm font-medium hidden md:table-cell">{formatCurrencySimple(Number(customer.total_spent), business?.currency || 'USD')}</TableCell>
                  <TableCell>{getStatusBadge(customer.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteCustomer(customer)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      <DeleteCustomerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        customerName={selectedCustomer?.name || ''}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Customers;
