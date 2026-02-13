import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrencySimple } from '@/lib/currency';

export default function SuperAdminPackages() {
  const { allPackages, loading } = useSuperAdmin();
  const formatCurrency = (amount: number) => formatCurrencySimple(amount, 'USD');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Packages</h1>
        <p className="text-muted-foreground">{allPackages.length} total packages sold</p>
      </div>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Packages</CardTitle>
          <CardDescription>Packages across all businesses</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allPackages.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No packages yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Package Name</TableHead>
                    <TableHead className="min-w-[80px]">Price</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[70px]">Credits</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[70px]">Used</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[100px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium truncate max-w-[150px]">{pkg.name}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{formatCurrency(Number(pkg.price))}</TableCell>
                      <TableCell className="hidden sm:table-cell">{pkg.total_credits}</TableCell>
                      <TableCell className="hidden sm:table-cell">{pkg.used_credits}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {pkg.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm whitespace-nowrap">{format(new Date(pkg.created_at), 'MMM d, yyyy')}</TableCell>
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
