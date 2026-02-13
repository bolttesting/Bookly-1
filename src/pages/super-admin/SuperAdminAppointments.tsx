import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrencySimple } from '@/lib/currency';

export default function SuperAdminAppointments() {
  const { allAppointments, loading } = useSuperAdmin();
  const formatCurrency = (amount: number) => formatCurrencySimple(amount, 'USD');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Appointments</h1>
        <p className="text-muted-foreground">{allAppointments.length} total appointments</p>
      </div>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>Recent appointments across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allAppointments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No appointments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Date</TableHead>
                    <TableHead className="min-w-[120px]">Time</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="min-w-[80px]">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAppointments.slice(0, 50).map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(new Date(apt.start_time), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        {format(new Date(apt.start_time), 'h:mm a')} - {format(new Date(apt.end_time), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                          {apt.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{apt.price ? formatCurrency(Number(apt.price)) : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {allAppointments.length > 50 && (
                <p className="text-sm text-muted-foreground mt-4">Showing latest 50 appointments</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
