import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { RevenueReport } from '@/hooks/useAnalytics';
import { DollarSign, Calendar, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';
import { useBusiness } from '@/hooks/useBusiness';

interface RevenueReportSectionProps {
  data: RevenueReport | undefined;
  loading: boolean;
}

export function RevenueReportSection({ data, loading }: RevenueReportSectionProps) {
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

  const stats = [
    {
      title: 'Total Revenue',
      value: formatCurrencySimple(data.totalRevenue, currency),
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Total Appointments',
      value: data.totalAppointments.toLocaleString(),
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Completed',
      value: data.completedAppointments.toLocaleString(),
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Cancelled',
      value: data.cancelledAppointments.toLocaleString(),
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  // Convert revenue by day to chart format
  const chartData = data.revenueByDay.map(day => ({
    name: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    revenue: day.revenue,
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

      {/* Additional Metrics */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Average Revenue per Appointment
            </CardTitle>
            <CardDescription>
              Calculated from completed appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              {formatCurrencySimple(data.averageRevenuePerAppointment, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>
              Percentage of appointments completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {data.totalAppointments > 0
                ? Math.round((data.completedAppointments / data.totalAppointments) * 100)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
          <CardDescription>
            Daily revenue breakdown for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RevenueChart data={chartData} loading={false} />
        </CardContent>
      </Card>

      {/* Revenue by Service */}
      {data.revenueByService.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Service</CardTitle>
            <CardDescription>
              Top services by revenue generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.revenueByService.slice(0, 10).map((service, index) => (
                <div key={service.serviceName} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{service.serviceName}</p>
                      <p className="text-sm text-muted-foreground">
                        {service.appointments} appointment{service.appointments !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-success">
                      {formatCurrencySimple(service.revenue, currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {service.revenue > 0 && data.totalRevenue > 0
                        ? Math.round((service.revenue / data.totalRevenue) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Staff */}
      {data.revenueByStaff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Staff</CardTitle>
            <CardDescription>
              Staff members ranked by revenue generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.revenueByStaff.slice(0, 10).map((staff, index) => (
                <div key={staff.staffName} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{staff.staffName}</p>
                      <p className="text-sm text-muted-foreground">
                        {staff.appointments} appointment{staff.appointments !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-bold text-success">
                      {formatCurrencySimple(staff.revenue, currency)}
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

