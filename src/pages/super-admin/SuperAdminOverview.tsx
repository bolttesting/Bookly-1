import { Link } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Package,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function SuperAdminOverview() {
  const { stats, loading } = useSuperAdmin();
  const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

  const statCards = [
    { label: 'Businesses', value: stats.totalBusinesses, icon: Building2 },
    { label: 'Packages', value: stats.totalPackages, icon: Package },
    { label: 'Active', value: stats.activePackages, icon: TrendingUp },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign },
    { label: 'Customers', value: stats.totalCustomers, icon: Users },
    { label: 'Appointments', value: stats.totalAppointments, icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Overview</h1>
        <p className="text-muted-foreground">Platform statistics at a glance</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {statCards.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="glass-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/super-admin/businesses">
                View Businesses
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/super-admin/plans">
                Manage Plans & Stripe
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
