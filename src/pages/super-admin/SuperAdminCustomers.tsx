import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';

export default function SuperAdminCustomers() {
  const { allCustomers, loading } = useSuperAdmin();
  const { settings } = useSiteSettings();
  const currency = settings?.default_currency ?? 'USD';
  const formatCurrency = (amount: number) => formatCurrencySimple(amount, currency);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold truncate">Customers</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{allCustomers.length} total customers across all businesses</p>
      </div>
      <Card className="glass-card overflow-hidden min-w-0 max-w-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">All Customers</CardTitle>
          <CardDescription>Customers across the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allCustomers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No customers yet</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[150px]">Email</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[120px]">Phone</TableHead>
                    <TableHead className="min-w-[100px]">Total Spent</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[70px]">Visits</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium truncate max-w-[120px]">{customer.name}</TableCell>
                      <TableCell className="hidden sm:table-cell truncate max-w-[150px]">{customer.email || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell truncate max-w-[120px]">{customer.phone || '-'}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{formatCurrency(Number(customer.total_spent))}</TableCell>
                      <TableCell className="hidden lg:table-cell">{customer.total_visits}</TableCell>
                      <TableCell>
                        <Badge variant={customer.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {customer.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
