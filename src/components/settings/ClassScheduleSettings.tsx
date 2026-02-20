import { useState } from 'react';
import { CalendarDays, MapPin, Plus, Pencil, Trash2, Loader2, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useBusiness } from '@/hooks/useBusiness';
import { useLocations } from '@/hooks/useLocations';
import { useFacilities } from '@/hooks/useFacilities';
import { useScheduledClasses, type ScheduledClassInsert } from '@/hooks/useScheduledClasses';
import { useServices } from '@/hooks/useServices';
import { useStaff } from '@/hooks/useStaff';
import { toast } from 'sonner';

const TIME_OPTIONS = Array.from({ length: 34 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  const value = `${h.toString().padStart(2, '0')}:${m}`;
  const label = new Date(`2000-01-01T${value}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { value, label };
});

export function ClassScheduleSettings() {
  const { business, updateBusiness } = useBusiness();
  const { locations, isLoading: locationsLoading } = useLocations();
  const { services } = useServices();
  const { data: staff = [] } = useStaff();
  const { rows, isLoading: scheduleLoading, create, remove, dayNames } = useScheduledClasses(business?.id ?? null);
  const [savingToggle, setSavingToggle] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const { facilities, isLoading: facilitiesLoading, create: createFacility, remove: removeFacility } = useFacilities(selectedLocationId ?? null);
  const { facilities: facilitiesForNewClass } = useFacilities(addClassOpen ? (newClassLocation || null) : null);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [newClassLocation, setNewClassLocation] = useState('');
  const [newClassDay, setNewClassDay] = useState(1);
  const [newClassTime, setNewClassTime] = useState('09:00');
  const [newClassService, setNewClassService] = useState('');
  const [newClassStaff, setNewClassStaff] = useState<string | null>(null);
  const [newClassFacility, setNewClassFacility] = useState<string | null>(null);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);

  const useClassSchedule = business?.use_class_schedule ?? false;

  const handleToggleClassSchedule = async (checked: boolean) => {
    if (!business?.id) return;
    setSavingToggle(true);
    try {
      await updateBusiness({ use_class_schedule: checked });
      toast.success(checked ? 'Class schedule enabled' : 'Class schedule disabled');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update');
    } finally {
      setSavingToggle(false);
    }
  };

  const handleAddClass = async () => {
    if (!newClassLocation || !newClassService) {
      toast.error('Select location and service');
      return;
    }
    try {
      await create.mutateAsync({
        location_id: newClassLocation,
        facility_id: newClassFacility || null,
        day_of_week: newClassDay,
        start_time: newClassTime,
        service_id: newClassService,
        staff_id: newClassStaff || null,
      });
      setAddClassOpen(false);
      setNewClassLocation('');
      setNewClassDay(1);
      setNewClassTime('09:00');
      setNewClassService('');
      setNewClassStaff(null);
      setNewClassFacility(null);
    } catch (_) {}
  };

  const handleAddFacility = async () => {
    if (!selectedLocationId || !newFacilityName.trim()) {
      toast.error('Select a location and enter facility name');
      return;
    }
    try {
      await createFacility.mutateAsync({ name: newFacilityName.trim() });
      setNewFacilityName('');
      setFacilityDialogOpen(false);
    } catch (_) {}
  };

  if (locationsLoading) {
    return (
      <div className="glass-card p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasLocations = locations.length > 0;
  const firstLocationId = locations[0]?.id ?? null;
  const currentLocationId = selectedLocationId ?? firstLocationId;

  return (
    <div className="space-y-6 w-full min-w-0">
      <Card className="glass-card overflow-hidden min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Class Schedule (Fitness / Yoga Studios)
          </CardTitle>
          <CardDescription>
            When enabled, customers see this week&apos;s classes and book by class instead of choosing a time slot. Set facilities (rooms) per location and a weekly repeating schedule.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Use class schedule</Label>
              <p className="text-sm text-muted-foreground">Show &quot;Today&apos;s classes&quot; on your booking page</p>
            </div>
            <Switch
              checked={useClassSchedule}
              onCheckedChange={handleToggleClassSchedule}
              disabled={savingToggle}
            />
          </div>

          {!hasLocations && (
            <p className="text-sm text-muted-foreground rounded-lg bg-muted/50 p-4">
              Add at least one location under the <strong>Locations</strong> tab, then come back to add facilities (rooms) and weekly classes here.
            </p>
          )}

          {useClassSchedule && hasLocations && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-2 block">Location</Label>
                <Select
                  value={currentLocationId ?? ''}
                  onValueChange={(v) => {
                    setSelectedLocationId(v || null);
                  }}
                >
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Facilities (rooms) for selected location */}
              {currentLocationId && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <DoorOpen className="h-4 w-4" />
                      Facilities (rooms)
                    </h3>
                    <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add facility</DialogTitle>
                          <DialogDescription>e.g. Reformer Room, Movement Room</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={newFacilityName}
                            onChange={(e) => setNewFacilityName(e.target.value)}
                            placeholder="Reformer Room"
                          />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setFacilityDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddFacility} disabled={!newFacilityName.trim() || createFacility.isPending}>
                            {createFacility.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {facilitiesLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                    </div>
                  ) : facilities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No facilities yet. Add rooms for this location.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {facilities.map((f) => (
                        <li key={f.id} className="flex items-center gap-1 rounded-md border bg-muted/30 px-2 py-1 text-sm">
                          {f.name}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove facility?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove &quot;{f.name}&quot;. Class slots using this facility will keep the slot but show no room.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeFacility.mutate(f.id)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <Separator />

              {/* Weekly class schedule */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-semibold">Weekly class schedule</h3>
                  <Dialog open={addClassOpen} onOpenChange={setAddClassOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add class
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add class to schedule</DialogTitle>
                        <DialogDescription>This class will repeat every week on the selected day and time.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3">
                        <div>
                          <Label>Location</Label>
                          <Select value={newClassLocation} onValueChange={setNewClassLocation}>
                            <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                            <SelectContent>
                              {locations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Day</Label>
                          <Select value={String(newClassDay)} onValueChange={(v) => setNewClassDay(Number(v))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {dayNames.map((name, i) => (
                                <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Time</Label>
                          <Select value={newClassTime} onValueChange={setNewClassTime}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Service (class)</Label>
                          <Select value={newClassService} onValueChange={setNewClassService}>
                            <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
                            <SelectContent>
                              {services.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Instructor (optional)</Label>
                          <Select value={newClassStaff ?? ''} onValueChange={(v) => setNewClassStaff(v || null)}>
                            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">—</SelectItem>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {(newClassLocation || currentLocationId) && (
                          <div>
                            <Label>Room (optional)</Label>
                            <Select value={newClassFacility ?? ''} onValueChange={(v) => setNewClassFacility(v || null)}>
                              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">—</SelectItem>
                                {(addClassOpen && newClassLocation ? facilitiesForNewClass : facilities).map((f) => (
                                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddClassOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddClass} disabled={!newClassLocation || !newClassService || create.isPending}>
                          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add class'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                {scheduleLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading schedule…
                  </div>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No classes in the schedule yet. Add classes that repeat every week.</p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2">Day</th>
                          <th className="text-left p-2">Time</th>
                          <th className="text-left p-2">Class</th>
                          <th className="text-left p-2">Instructor</th>
                          <th className="text-left p-2">Room</th>
                          <th className="w-10 p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <tr key={r.id} className="border-b last:border-0">
                            <td className="p-2">{dayNames[r.day_of_week]}</td>
                            <td className="p-2">{new Date(`2000-01-01T${r.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                            <td className="p-2">{r.service?.name ?? '—'}</td>
                            <td className="p-2">{r.staff?.name ?? '—'}</td>
                            <td className="p-2">{r.facility?.name ?? '—'}</td>
                            <td className="p-2">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove this class from schedule?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {dayNames[r.day_of_week]} {new Date(`2000-01-01T${r.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – {r.service?.name}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => remove.mutate(r.id)}>Remove</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Separator() {
  return <div className="border-t border-border my-4" />;
}
