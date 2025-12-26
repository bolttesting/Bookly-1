import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerAnalytics } from '@/hooks/useAnalytics';
import { Users, UserPlus, Repeat, TrendingUp, Award } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';
import { useBusiness } from '@/hooks/useBusiness';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CustomerAnalyticsSectionProps {
  data: CustomerAnalytics | undefined;
  loading: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function CustomerAnalyticsSection({ data, loading }: CustomerAnalyticsSectionProps) {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Customers',
      value: data.totalCustomers.toLocaleString(),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'New Customers',
      value: data.newCustomers.toLocaleString(),
      icon: UserPlus,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Returning Customers',
      value: data.returningCustomers.toLocaleString(),
      icon: Repeat,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Avg Lifetime Value',
      value: formatCurrencySimple(data.averageLifetimeValue, currency),
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  const newVsReturningData = [
    { name: 'New', value: data.newVsReturning.new },
    { name: 'Returning', value: data.newVsReturning.returning },
  ];

  const customerGrowthData = data.customerGrowth.map(item => ({
    date: format(new Date(item.date), 'MMM dd'),
    new: item.newCustomers,
    total: item.totalCustomers,
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* New vs Returning Chart */}
        <Card>
          <CardHeader>
            <CardTitle>New vs Returning Customers</CardTitle>
            <CardDescription>
              Customer breakdown for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={newVsReturningData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {newVsReturningData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <CardDescription>
              New customers over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="new" fill="#6366f1" name="New Customers" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      {data.topCustomers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Customers
            </CardTitle>
            <CardDescription>
              Customers ranked by total spending
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topCustomers.map((customer, index) => (
                <div key={customer.customerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{customer.customerName}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        <span>{customer.totalVisits} visit{customer.totalVisits !== 1 ? 's' : ''}</span>
                        {customer.lastVisit && (
                          <span>• Last visit: {format(new Date(customer.lastVisit), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-success">
                      {formatCurrencySimple(customer.totalSpent, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {formatCurrencySimple(customer.averageSpent, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

