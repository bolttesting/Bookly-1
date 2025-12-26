import { useState } from 'react';
import { useRecurringAppointments, RecurringAppointmentSeries } from '@/hooks/useRecurringAppointments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, MoreVertical, Play, Pause, X, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export function RecurringSeriesManager() {
  const { series, isLoading, pauseSeries, resumeSeries, cancelSeries, generateAppointments } = useRecurringAppointments();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<RecurringAppointmentSeries | null>(null);
  const [generatingSeriesId, setGeneratingSeriesId] = useState<string | null>(null);

  const handlePause = async (series: RecurringAppointmentSeries) => {
    await pauseSeries.mutateAsync(series.id);
  };

  const handleResume = async (series: RecurringAppointmentSeries) => {
    await resumeSeries.mutateAsync(series.id);
  };

  const handleCancel = async () => {
    if (!selectedSeries) return;
    await cancelSeries.mutateAsync(selectedSeries.id);
    setCancelDialogOpen(false);
    setSelectedSeries(null);
  };

  const handleGenerateAppointments = async (series: RecurringAppointmentSeries) => {
    setGeneratingSeriesId(series.id);
    try {
      const untilDate = series.end_date 
        ? new Date(series.end_date)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months ahead
      await generateAppointments.mutateAsync({
        seriesId: series.id,
        untilDate,
      });
    } finally {
      setGeneratingSeriesId(null);
    }
  };

  const getRecurrenceDescription = (series: RecurringAppointmentSeries) => {
    const pattern = series.recurrence_pattern === 'weekly' ? 'week' : 'month';
    const frequency = series.recurrence_frequency > 1 
      ? `every ${series.recurrence_frequency} ${pattern}s`
      : `every ${pattern}`;
    
    let endDesc = '';
    if (series.end_date) {
      endDesc = ` until ${format(new Date(series.end_date), 'MMM d, yyyy')}`;
    } else if (series.max_occurrences) {
      endDesc = ` (${series.max_occurrences} occurrences)`;
    }
    
    return `Repeats ${frequency}${endDesc}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No recurring appointment series found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create a recurring series from the appointment dialog
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Recurring Appointment Series</CardTitle>
          <CardDescription>
            Manage your recurring appointment series. Appointments are automatically generated based on the schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {series.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.customer?.name || 'Unknown Customer'}
                    </TableCell>
                    <TableCell>{s.service?.name || 'Unknown Service'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getRecurrenceDescription(s)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(`2000-01-01T${s.time_of_day}`), 'h:mm a')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === 'active' ? 'default' :
                          s.status === 'paused' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(s.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {s.status === 'active' ? (
                            <DropdownMenuItem
                              onClick={() => handlePause(s)}
                              disabled={pauseSeries.isPending}
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Pause Series
                            </DropdownMenuItem>
                          ) : s.status === 'paused' ? (
                            <DropdownMenuItem
                              onClick={() => handleResume(s)}
                              disabled={resumeSeries.isPending}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Resume Series
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem
                            onClick={() => handleGenerateAppointments(s)}
                            disabled={generatingSeriesId === s.id || generateAppointments.isPending}
                          >
                            {generatingSeriesId === s.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Generate Appointments
                          </DropdownMenuItem>
                          {s.status !== 'cancelled' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSeries(s);
                                setCancelDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <X className="mr-2 h-4 w-4" />
                              Cancel Series
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Recurring Series</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this recurring appointment series?
              {selectedSeries && (
                <>
                  {' '}This will cancel the <strong>{selectedSeries.service?.name}</strong> series for{' '}
                  <strong>{selectedSeries.customer?.name}</strong>.
                </>
              )}
              <span className="block mt-2 text-sm text-muted-foreground">
                Future appointments in this series will not be generated, but existing appointments will remain.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelSeries.isPending}>
              Keep Series
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelSeries.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelSeries.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Series'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

