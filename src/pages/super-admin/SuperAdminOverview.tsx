import { Link } from 'react-router-dom';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { formatCurrencySimple } from '@/lib/currency';
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
  const { settings } = useSiteSettings();
  const currency = settings?.default_currency ?? 'USD';
  const formatCurrency = (amount: number) => formatCurrencySimple(amount, currency);

  const statCards = [
    { label: 'Businesses', value: stats.totalBusinesses, icon: Building2 },
    { label: 'Packages', value: stats.totalPackages, icon: Package },
    { label: 'Active', value: stats.activePackages, icon: TrendingUp },
    { label: 'Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign },
    { label: 'Customers', value: stats.totalCustomers, icon: Users },
    { label: 'Appointments', value: stats.totalAppointments, icon: Calendar },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full min-w-0">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-display font-bold truncate">Overview</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Platform statistics at a glance</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4 min-w-0">
            {statCards.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="glass-card overflow-hidden min-w-0">
                <CardContent className="p-4 sm:pt-6">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
                      <p className="text-xs text-muted-foreground truncate">{label}</p>
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
