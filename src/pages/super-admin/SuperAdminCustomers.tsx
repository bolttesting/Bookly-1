import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';

export default function SuperAdminCustomers() {
  const { allCustomers, loading } = useSuperAdmin();
  const formatCurrency = (amount: number) => formatCurrencySimple(amount, 'USD');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Customers</h1>
        <p className="text-muted-foreground">{allCustomers.length} total customers across all businesses</p>
      </div>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>Customers across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allCustomers.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No customers yet</p>
          ) : (
            <div className="overflow-x-auto">
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
