import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isTomorrow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { useCurrency } from "@/hooks/useCurrency";

interface Appointment {
  id: string;
  start_time: string;
  status: string;
  price: number | null;
  customer: { id: string; name: string };
  service: { id: string; name: string };
  staff: { id: string; name: string } | null;
}

interface RecentAppointmentsProps {
  appointments: Appointment[];
  loading?: boolean;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-success/20 text-success";
    case "confirmed":
      return "bg-primary/20 text-primary";
    case "cancelled":
      return "bg-destructive/20 text-destructive";
    default:
      return "bg-warning/20 text-warning";
  }
}

export function RecentAppointments({ appointments, loading }: RecentAppointmentsProps) {
  const { format } = useCurrency();
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <div className="glass-card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-3 sm:p-4 md:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Appointments</h3>
        <Button variant="ghost" size="sm" asChild className="text-xs sm:text-sm">
          <Link to="/calendar">View All</Link>
        </Button>
      </div>
      {appointments.length === 0 ? (
        <div className="p-6 sm:p-8 text-center text-muted-foreground">
          <p className="text-sm sm:text-base">No appointments yet</p>
          <p className="text-xs sm:text-sm mt-1">Create your first appointment to see it here</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs sm:text-sm">Customer</TableHead>
                <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Service</TableHead>
                <TableHead className="text-xs sm:text-sm hidden md:table-cell">Staff</TableHead>
                <TableHead className="text-xs sm:text-sm">Date & Time</TableHead>
                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Amount</TableHead>
                <TableHead className="w-[50px] text-xs sm:text-sm"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((apt) => (
                <TableRow key={apt.id} className="border-border hover:bg-secondary/50">
                  <TableCell className="font-medium text-xs sm:text-sm">
                    <div className="flex flex-col sm:block">
                      <span>{apt.customer?.name || 'Unknown'}</span>
                      <span className="text-muted-foreground sm:hidden text-xs mt-0.5">{apt.service?.name || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{apt.service?.name || 'Unknown'}</TableCell>
                  <TableCell className="text-xs sm:text-sm hidden md:table-cell">{apt.staff?.name || 'Unassigned'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {formatDate(apt.start_time)}, {format(new Date(apt.start_time), "h:mm a")}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(apt.status)} text-xs`}>
                      {apt.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{format(apt.price || 0)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem onClick={() => navigate(`/calendar?appointment=${apt.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/calendar')}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Go to Calendar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}