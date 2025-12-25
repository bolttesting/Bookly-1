import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentAppointments } from "@/components/dashboard/RecentAppointments";
import { UpcomingSchedule } from "@/components/dashboard/UpcomingSchedule";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { stats, recentAppointments, upcomingAppointments, weeklyRevenue, loading } = useDashboard();

  // Get first name from user metadata or email
  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'there';

  // Show loading if business is not available yet
  if (!business) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in px-2 sm:px-0">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground truncate">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="shrink-0">
          <QuickActions />
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} loading={loading} />

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Revenue Chart - Takes 2 columns */}
        <div className="lg:col-span-2 min-w-0">
          <RevenueChart data={weeklyRevenue} loading={loading} />
        </div>

        {/* Upcoming Schedule */}
        <div className="lg:col-span-1 min-w-0">
          <UpcomingSchedule appointments={upcomingAppointments} loading={loading} />
        </div>
      </div>

      {/* Recent Appointments */}
      <RecentAppointments appointments={recentAppointments} loading={loading} />
    </div>
  );
};

export default Dashboard;