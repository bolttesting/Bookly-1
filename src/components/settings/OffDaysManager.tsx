import { useState } from 'react';
import { Calendar, X, Plus, CalendarX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOffDays } from '@/hooks/useOffDays';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OffDaysManagerProps {
  locationId?: string | null;
  locationName?: string;
}

export function OffDaysManager({ locationId, locationName }: OffDaysManagerProps) {
  const { offDays, isLoading, createOffDay, deleteOffDay } = useOffDays(locationId);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddOffDay = async () => {
    if (!selectedDate) {
      return;
    }

    try {
      await createOffDay.mutateAsync({
        off_date: selectedDate,
        reason: reason || undefined,
        location_id: locationId || null,
      });
      setSelectedDate(undefined);
      setReason('');
      setIsAdding(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this off day?')) {
      await deleteOffDay.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-secondary rounded" />
        <div className="h-12 bg-secondary rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <CalendarX className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Off Days {locationName && `(${locationName})`}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Mark specific dates as closed (holidays, special events, etc.)
          </p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Off Day
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="glass-card p-4 space-y-4 border border-primary/20">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm sm:text-base">Add New Off Day</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsAdding(false);
                setSelectedDate(undefined);
                setReason('');
              }}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="off-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="off-reason">Reason (Optional)</Label>
              <Input
                id="off-reason"
                placeholder="e.g., Holiday, Special Event"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-secondary"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddOffDay}
                disabled={!selectedDate || createOffDay.isPending}
                size="sm"
                className="flex-1"
              >
                {createOffDay.isPending ? 'Adding...' : 'Add Off Day'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setSelectedDate(undefined);
                  setReason('');
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {offDays.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <CalendarX className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No off days set</p>
          <p className="text-xs mt-1">Add dates when your business will be closed</p>
        </div>
      ) : (
        <div className="space-y-2">
          {offDays.map((offDay) => (
            <div
              key={offDay.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base">
                    {format(new Date(offDay.off_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                  {offDay.reason && (
                    <p className="text-xs text-muted-foreground truncate">{offDay.reason}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(offDay.id)}
                disabled={deleteOffDay.isPending}
                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

