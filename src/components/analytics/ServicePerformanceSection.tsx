import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ServicePerformance } from '@/hooks/useAnalytics';
import { Briefcase, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';
import { useBusiness } from '@/hooks/useBusiness';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ServicePerformanceSectionProps {
  data: ServicePerformance | undefined;
  loading: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export function ServicePerformanceSection({ data, loading }: ServicePerformanceSectionProps) {
  const { business } = useBusiness();
  const currency = business?.currency || 'USD';

  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const revenueChartData = data.revenueByService.slice(0, 10).map((service, index) => ({
    name: service.serviceName.length > 15 
      ? service.serviceName.substring(0, 15) + '...' 
      : service.serviceName,
    fullName: service.serviceName,
    revenue: service.revenue,
    bookings: service.bookings,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Services</p>
                <p className="text-2xl font-bold text-primary">{data.totalServices}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Bookings</p>
                <p className="text-2xl font-bold text-success">
                  {data.mostBookedServices.reduce((sum, s) => sum + s.bookings, 0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-success">
                  {formatCurrencySimple(
                    data.revenueByService.reduce((sum, s) => sum + s.revenue, 0),
                    currency
                  )}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Service Chart */}
      {revenueChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>
              Top services by revenue generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={revenueChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip 
                  formatter={(value: number) => formatCurrencySimple(value, currency)}
                  labelFormatter={(label) => `Service: ${label}`}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {revenueChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Most Booked Services */}
      {data.mostBookedServices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Booked Services</CardTitle>
            <CardDescription>
              Services ranked by number of bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.mostBookedServices.map((service, index) => (
                <div key={service.serviceId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{service.serviceName}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        <span>{service.bookings} booking{service.bookings !== 1 ? 's' : ''}</span>
                        <span>• Avg: {formatCurrencySimple(service.averagePrice, currency)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-success">
                      {formatCurrencySimple(service.revenue, currency)}
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

