import { Clock, User, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface Appointment {
  id: string;
  start_time: string;
  status: string;
  customer: { id: string; name: string };
  service: { id: string; name: string };
}

interface UpcomingScheduleProps {
  appointments: Appointment[];
  loading?: boolean;
}

export function UpcomingSchedule({ appointments, loading }: UpcomingScheduleProps) {
  if (loading) {
    return (
      <div className="glass-card p-5 h-full">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 h-full">
      <h3 className="font-semibold text-foreground mb-4">Upcoming Today</h3>
      {appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <CalendarX className="h-10 w-10 mb-2 opacity-50" />
          <p className="text-sm">No more appointments today</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div 
              key={apt.id} 
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{apt.customer?.name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">{apt.service?.name || 'Unknown'}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(apt.start_time), "h:mm a")}
                </div>
                <Badge 
                  variant="outline" 
                  className={apt.status === "confirmed" ? "text-success border-success/30" : "text-warning border-warning/30"}
                >
                  {apt.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}