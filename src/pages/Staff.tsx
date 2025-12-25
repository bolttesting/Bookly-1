import { useState } from 'react';
import { Plus, Search, MoreVertical, Mail, Phone, Edit, Trash2, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStaff, StaffMember, StaffFormData } from '@/hooks/useStaff';
import { StaffDialog } from '@/components/staff/StaffDialog';
import { DeleteStaffDialog } from '@/components/staff/DeleteStaffDialog';

const Staff = () => {
  const { staff, isLoading, createStaff, updateStaff, deleteStaff } = useStaff();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredStaff = staff.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchQuery.toLowerCase())
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
      case "available":
        return (
          <Badge className="bg-success/20 text-success border-success/30">
            Available
          </Badge>
        );
      case "busy":
        return (
          <Badge className="bg-warning/20 text-warning border-warning/30">
            Busy
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-muted-foreground">
            Off
          </Badge>
        );
    }
  };

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setDialogOpen(true);
  };

  const handleEditStaff = (member: StaffMember) => {
    setSelectedStaff(member);
    setDialogOpen(true);
  };

  const handleDeleteStaff = (member: StaffMember) => {
    setSelectedStaff(member);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: StaffFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedStaff) {
        await updateStaff.mutateAsync({ id: selectedStaff.id, ...data });
      } else {
        await createStaff.mutateAsync(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedStaff) return;
    setIsSubmitting(true);
    try {
      await deleteStaff.mutateAsync(selectedStaff.id);
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and schedules
          </p>
        </div>
        <Button className="animated-gradient text-primary-foreground" onClick={handleAddStaff}>
          <Plus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchQuery ? 'No staff found' : 'No staff members yet'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Get started by adding your first team member.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddStaff}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map((member) => (
            <div
              key={member.id}
              className="glass-card p-5 hover-lift group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 ring-2 ring-border">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-lg">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{member.name}</h3>
                    <p className="text-sm text-muted-foreground">{member.role || 'No role'}</p>
                  </div>
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
                    <DropdownMenuItem onClick={() => handleEditStaff(member)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeleteStaff(member)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {member.phone}
                  </div>
                )}
                {!member.email && !member.phone && (
                  <p className="text-sm text-muted-foreground">No contact info</p>
                )}
              </div>

              {member.specialties && member.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {member.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="pt-4 border-t border-border">
                {getStatusBadge(member.status)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        staffMember={selectedStaff}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      <DeleteStaffDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        staffName={selectedStaff?.name || ''}
        onConfirm={handleConfirmDelete}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default Staff;
