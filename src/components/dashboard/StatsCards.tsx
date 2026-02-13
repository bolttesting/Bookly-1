import { CalendarCheck, Users, DollarSign, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencySimple } from "@/lib/currency";

interface StatsCardsProps {
  currency?: string;
  stats: {
    todayBookings: number;
    yesterdayBookings: number;
    totalCustomers: number;
    newCustomersThisMonth: number;
    todayRevenue: number;
    completionRate: number;
  } | null;
  loading?: boolean;
}

export function StatsCards({ stats, loading, currency = 'USD' }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const bookingDiff = stats.todayBookings - stats.yesterdayBookings;
  const bookingChange = bookingDiff >= 0 ? `+${bookingDiff} from yesterday` : `${bookingDiff} from yesterday`;

  const statItems = [
    {
      title: "Today's Bookings",
      value: stats.todayBookings.toString(),
      change: bookingChange,
      icon: CalendarCheck,
      trend: bookingDiff >= 0 ? "up" : "down",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toLocaleString(),
      change: `+${stats.newCustomersThisMonth} this month`,
      icon: Users,
      trend: "up",
    },
    {
      title: "Revenue Today",
      value: formatCurrencySimple(stats.todayRevenue, currency),
      change: "From completed appointments",
      icon: DollarSign,
      trend: "up",
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      change: "This week",
      icon: TrendingUp,
      trend: stats.completionRate >= 90 ? "up" : "down",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat) => (
        <div key={stat.title} className="glass-card p-5 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{stat.title}</span>
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          <p className={`text-xs mt-1 ${stat.trend === "up" ? "text-success" : "text-muted-foreground"}`}>
            {stat.change}
          </p>
        </div>
      ))}
    </div>
  );
}