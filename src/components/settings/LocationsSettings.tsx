import { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Star, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useLocations, Location, LocationFormData } from '@/hooks/useLocations';

export function LocationsSettings() {
  const { locations, isLoading, createLocation, updateLocation, deleteLocation } = useLocations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const resetForm = () => {
    setName('');
    setAddress('');
    setCity('');
    setPhone('');
    setEmail('');
    setIsPrimary(false);
    setEditingLocation(null);
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    setName(location.name);
    setAddress(location.address || '');
    setCity(location.city || '');
    setPhone(location.phone || '');
    setEmail(location.email || '');
    setIsPrimary(location.is_primary);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const data: LocationFormData = {
      name: name.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      is_primary: isPrimary,
    };

    if (editingLocation) {
      await updateLocation.mutateAsync({ id: editingLocation.id, ...data });
    } else {
      await createLocation.mutateAsync(data);
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteLocation.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/4"></div>
          <div className="h-20 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="glass-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-semibold">Business Locations</h2>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
                <DialogDescription>
                  {editingLocation ? 'Update the location details.' : 'Add a new location for your business.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="location-name">Location Name *</Label>
                  <Input
                    id="location-name"
                    placeholder="Main Branch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location-address">Address</Label>
                  <Input
                    id="location-address"
                    placeholder="123 Main Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location-city">City</Label>
                  <Input
                    id="location-city"
                    placeholder="New York"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location-phone">Phone</Label>
                    <Input
                      id="location-phone"
                      placeholder="+1 (555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location-email">Email</Label>
                    <Input
                      id="location-email"
                      type="email"
                      placeholder="branch@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-secondary"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">Primary Location</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Set as the main business location</p>
                  </div>
                  <Switch checked={isPrimary} onCheckedChange={setIsPrimary} className="shrink-0" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!name.trim()}>
                  {editingLocation ? 'Save Changes' : 'Add Location'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-sm sm:text-base text-muted-foreground mb-4">
          Manage multiple locations for your business. Customers can choose their preferred location when booking.
        </p>

        {locations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
              <Building2 className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
              <CardTitle className="text-base sm:text-lg mb-2">No locations yet</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Add your first location to allow customers to book at specific branches.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            {locations.map((location) => (
              <Card key={location.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <CardTitle className="text-sm sm:text-base truncate">{location.name}</CardTitle>
                      {location.is_primary && (
                        <Badge variant="secondary" className="gap-1 shrink-0 text-xs">
                          <Star className="h-3 w-3" />
                          <span className="hidden sm:inline">Primary</span>
                          <span className="sm:hidden">P</span>
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(location)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Location</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{location.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(location.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  {location.address && <p className="truncate">{location.address}</p>}
                  {location.city && <p className="truncate">{location.city}</p>}
                  {location.phone && <p className="truncate">{location.phone}</p>}
                  {location.email && <p className="truncate">{location.email}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
