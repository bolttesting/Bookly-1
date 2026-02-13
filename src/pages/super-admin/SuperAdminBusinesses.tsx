import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function SuperAdminBusinesses() {
  const { allBusinesses, loading } = useSuperAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Businesses</h1>
        <p className="text-muted-foreground">{allBusinesses.length} registered businesses</p>
      </div>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>All Businesses</CardTitle>
          <CardDescription>Platform-wide business list</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allBusinesses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No businesses yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[100px]">Industry</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[100px]">City</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[150px]">Email</TableHead>
                    <TableHead className="min-w-[100px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBusinesses.map((business) => (
                    <TableRow key={business.id}>
                      <TableCell className="font-medium truncate max-w-[150px]">{business.name}</TableCell>
                      <TableCell className="hidden sm:table-cell truncate max-w-[100px]">{business.industry || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell truncate max-w-[100px]">{business.city || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell truncate max-w-[150px]">{business.email || '-'}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(new Date(business.created_at), 'MMM d, yyyy')}</TableCell>
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
