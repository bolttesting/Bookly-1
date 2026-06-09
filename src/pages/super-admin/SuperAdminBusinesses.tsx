import { useMemo } from 'react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function SuperAdminBusinesses() {
  const { allBusinesses, subscriptionPlans, loading } = useSuperAdmin();

  const planById = useMemo(() => {
    const map = new Map<string, (typeof subscriptionPlans)[number]>();
    subscriptionPlans.forEach((p) => map.set(p.id, p));
    return map;
  }, [subscriptionPlans]);

  const paidCount = useMemo(
    () =>
      allBusinesses.filter((b) => {
        const plan = b.subscription_plan_id ? planById.get(b.subscription_plan_id) : undefined;
        return !!plan && plan.price > 0;
      }).length,
    [allBusinesses, planById]
  );

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold truncate">Businesses</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {allBusinesses.length} registered &middot; {paidCount} on a paid plan
        </p>
      </div>
      <Card className="glass-card overflow-hidden min-w-0 max-w-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">All Businesses</CardTitle>
          <CardDescription>Platform-wide business list</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : allBusinesses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No businesses yet</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Name</TableHead>
                    <TableHead className="min-w-[110px]">Plan</TableHead>
                    <TableHead className="hidden sm:table-cell min-w-[100px]">Industry</TableHead>
                    <TableHead className="hidden md:table-cell min-w-[100px]">City</TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[150px]">Email</TableHead>
                    <TableHead className="min-w-[100px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBusinesses.map((business) => {
                    const plan = business.subscription_plan_id
                      ? planById.get(business.subscription_plan_id)
                      : undefined;
                    const isPaid = !!plan && plan.price > 0;
                    return (
                    <TableRow key={business.id}>
                      <TableCell className="font-medium truncate max-w-[150px]">{business.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={isPaid ? 'default' : 'secondary'}
                            className={isPaid ? 'bg-green-600 hover:bg-green-600' : ''}
                          >
                            {isPaid ? 'Paid' : 'Free'}
                          </Badge>
                          {plan && (
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                              {plan.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell truncate max-w-[100px]">{business.industry || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell truncate max-w-[100px]">{business.city || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell truncate max-w-[150px]">{business.email || '-'}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(new Date(business.created_at), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
