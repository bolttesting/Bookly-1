import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffPerformance } from '@/hooks/useAnalytics';
import { UserCheck, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrencySimple } from '@/lib/currency';
import { useBusiness } from '@/hooks/useBusiness';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StaffPerformanceSectionProps {
  data: StaffPerformance | undefined;
  loading: boolean;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function StaffPerformanceSection({ data, loading }: StaffPerformanceSectionProps) {
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

  const revenueChartData = data.staffStats.map((staff, index) => ({
    name: staff.staffName.length > 15 
      ? staff.staffName.substring(0, 15) + '...' 
      : staff.staffName,
    fullName: staff.staffName,
    revenue: staff.revenue,
    appointments: staff.completedAppointments,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Summary Stats */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Staff Members</p>
              <p className="text-2xl font-bold text-primary">{data.totalStaff}</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Staff Chart */}
      {revenueChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Staff</CardTitle>
            <CardDescription>
              Staff members ranked by revenue generated
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
                  labelFormatter={(label) => `Staff: ${label}`}
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

      {/* Staff Performance Table */}
      {data.staffStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Staff Performance Details</CardTitle>
            <CardDescription>
              Comprehensive performance metrics for each staff member
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.staffStats.map((staff, index) => (
                <div key={staff.staffId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{staff.staffName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success text-lg">
                        {formatCurrencySimple(staff.revenue, currency)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        <span>Total</span>
                      </div>
                      <p className="font-semibold">{staff.totalAppointments}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>Completed</span>
                      </div>
                      <p className="font-semibold text-success">{staff.completedAppointments}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Avg Revenue</span>
                      </div>
                      <p className="font-semibold">
                        {formatCurrencySimple(staff.averageRevenuePerAppointment, currency)}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <span>Completion</span>
                      </div>
                      <p className="font-semibold">{Math.round(staff.completionRate)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.staffStats.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground py-8">
              No staff performance data available for the selected period.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

