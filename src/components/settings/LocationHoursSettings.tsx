import { useState, useEffect, useRef } from 'react';
import { Clock, Save, MapPin, ChevronDown, Calendar, X, Plus, Ban, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useLocations } from '@/hooks/useLocations';
import { useServices } from '@/hooks/useServices';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OffDaysManager } from './OffDaysManager';
import { SplitHoursEditor } from './SplitHoursEditor';
import { BlockedSlotsManager } from './BlockedSlotsManager';
import { ServiceScheduleEditor } from './ServiceScheduleEditor';

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
  const label = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { value: time, label };
});

interface HoursEditorProps {
  locationId?: string | null;
  locationName?: string;
}

function HoursEditor({ locationId, locationName }: HoursEditorProps) {
  const { hoursByDay, isLoading, saveHours } = useBusinessHours(undefined, locationId);
  const [localHours, setLocalHours] = useState<typeof hoursByDay>([]);
  const initialized = useRef(false);

  // Initialize local hours when hoursByDay is ready
  useEffect(() => {
    if (!isLoading && hoursByDay.length === 7 && !initialized.current) {
      setLocalHours(hoursByDay);
      initialized.current = true;
    }
  }, [hoursByDay, isLoading]);

  // Reset when switching locations
  useEffect(() => {
    initialized.current = false;
    setLocalHours([]);
  }, [locationId]);

  const handleToggleClosed = (dayIndex: number, closed: boolean) => {
    setLocalHours(prev =>
      prev.map(h => (h.day === dayIndex ? { ...h, is_closed: closed } : h))
    );
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setLocalHours(prev =>
      prev.map(h => (h.day === dayIndex ? { ...h, [field]: value } : h))
    );
  };

  const handleSave = () => {
    saveHours.mutate(
      localHours.map(h => ({
        day_of_week: h.day,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }))
    );
  };

  if (isLoading || localHours.length === 0) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 bg-secondary rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveHours.isPending} size="sm" className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          {saveHours.isPending ? 'Saving...' : 'Save Hours'}
        </Button>
      </div>

      <div className="space-y-2">
        {localHours.map((day) => (
          <div
            key={day.day}
            className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border transition-colors ${
              day.is_closed ? 'bg-muted/50 border-border/50' : 'bg-secondary/30 border-border'
            }`}
          >
            <div className="w-full sm:w-24 font-medium text-sm shrink-0">{day.name}</div>

            <div className="flex items-center gap-2 shrink-0">
              <Switch
                checked={!day.is_closed}
                onCheckedChange={(checked) => handleToggleClosed(day.day, !checked)}
              />
              <Label className="text-xs text-muted-foreground">
                {day.is_closed ? 'Closed' : 'Open'}
              </Label>
            </div>

            {!day.is_closed && (
              <div className="flex items-center gap-2 sm:ml-auto flex-1 sm:flex-initial">
                <Select
                  value={day.open_time}
                  onValueChange={(value) => handleTimeChange(day.day, 'open_time', value)}
                >
                  <SelectTrigger className="w-full sm:w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground text-xs shrink-0">to</span>

                <Select
                  value={day.close_time}
                  onValueChange={(value) => handleTimeChange(day.day, 'close_time', value)}
                >
                  <SelectTrigger className="w-full sm:w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {day.is_closed && (
              <span className="sm:ml-auto text-xs text-muted-foreground italic shrink-0">
                Not available
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceSchedulesSection() {
  const { services, isLoading: servicesLoading } = useServices();
  const { hoursByDay } = useBusinessHours();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const defaultOpen = hoursByDay.find(h => !h.is_closed)?.open_time?.slice(0, 5) ?? '09:00';
  const defaultClose = hoursByDay.find(h => !h.is_closed)?.close_time?.slice(0, 5) ?? '18:00';

  if (servicesLoading || services.length === 0) return null;

  const activeServiceId = selectedServiceId || services[0]?.id;

  return (
    <div className="border-t border-border pt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-lg border cursor-pointer hover:bg-secondary/50 transition-colors gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">Service Schedules</p>
                <p className="text-xs text-muted-foreground truncate">
                  Set when each service is bookable (e.g. Pilates 9am–1pm, Yoga 2pm–4pm)
                </p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 sm:pt-4 px-2 sm:px-4 space-y-4">
          <div className="space-y-2 mb-4">
            <p className="text-xs text-muted-foreground">
              Useful when 1 employee offers multiple services at different times each day.
            </p>
            <div className="flex flex-wrap gap-2">
              {services.map((svc) => (
                <Button
                  key={svc.id}
                  variant={activeServiceId === svc.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedServiceId(svc.id)}
                >
                  {svc.name}
                </Button>
              ))}
            </div>
          </div>
          {activeServiceId && (
            <div className="border rounded-lg p-4 bg-background/50">
              <ServiceScheduleEditor
                serviceId={activeServiceId}
                serviceName={services.find(s => s.id === activeServiceId)?.name ?? ''}
                businessOpenTime={defaultOpen}
                businessCloseTime={defaultClose}
              />
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function LocationHoursSettings() {
  const { locations, isLoading: locationsLoading } = useLocations();
  const [openLocations, setOpenLocations] = useState<string[]>([]);

  const toggleLocation = (locationId: string) => {
    setOpenLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  if (locationsLoading) {
    return (
      <div className="glass-card p-4 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/4" />
          <div className="h-20 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  // If no locations, show default business hours and blocked slots
  if (locations.length === 0) {
    return (
      <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            Business Hours
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Set your operating hours for each day of the week
          </p>
        </div>
        <HoursEditor locationId={null} />
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Ban className="h-4 w-4" />
            Blocked Slots
          </h3>
          <BlockedSlotsManager />
        </div>
        <ServiceSchedulesSection />
      </div>
    );
  }

  return (
    <div className="glass-card p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          Location Hours
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Set operating hours for each location. Each location can have different hours.
        </p>
      </div>

      <div className="space-y-4">
        {/* Blocked Slots */}
        <Collapsible
          open={openLocations.includes('blocked')}
          onOpenChange={() => toggleLocation('blocked')}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-lg border cursor-pointer hover:bg-secondary/50 transition-colors gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Ban className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">Blocked Slots</p>
                  <p className="text-xs text-muted-foreground truncate">View and manage blocked time slots</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform shrink-0 ${openLocations.includes('blocked') ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 sm:pt-4 px-2 sm:px-4">
            <BlockedSlotsManager />
          </CollapsibleContent>
        </Collapsible>

        {/* Default Business Hours */}
        <Collapsible
          open={openLocations.includes('default')}
          onOpenChange={() => toggleLocation('default')}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-lg border cursor-pointer hover:bg-secondary/50 transition-colors gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">Default Hours</p>
                  <p className="text-xs text-muted-foreground truncate">Applies to locations without custom hours</p>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform shrink-0 ${openLocations.includes('default') ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 sm:pt-4 px-2 sm:px-4 space-y-6">
            <SplitHoursEditor locationId={null} />
            <div className="border-t border-border pt-4">
              <OffDaysManager locationId={null} locationName="Default" />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Service Schedules */}
        <ServiceSchedulesSection />

        {/* Location-Specific Hours */}
        {locations.map((location) => (
          <Collapsible
            key={location.id}
            open={openLocations.includes(location.id)}
            onOpenChange={() => toggleLocation(location.id)}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 sm:p-4 bg-secondary/30 rounded-lg border cursor-pointer hover:bg-secondary/50 transition-colors gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{location.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {location.address || location.city || 'No address set'}
                    </p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform shrink-0 ${openLocations.includes(location.id) ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 sm:pt-4 px-2 sm:px-4 space-y-6">
              <SplitHoursEditor locationId={location.id} locationName={location.name} />
              <div className="border-t border-border pt-4">
                <OffDaysManager locationId={location.id} locationName={location.name} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}