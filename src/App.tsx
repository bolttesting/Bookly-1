import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ProtectedRoute from "@/components/ProtectedRoute";
import RequiresBusiness from "@/components/RequiresBusiness";
import RequiresAdmin from "@/components/RequiresAdmin";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import DashboardLayout from "./layouts/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import { Loader2 } from "lucide-react";

// Eager load: landing + auth (critical path)
import Landing from "./pages/Landing";
import UnifiedAuth from "./pages/UnifiedAuth";

// Lazy load: dashboard and heavier pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Services = lazy(() => import("./pages/Services"));
const Packages = lazy(() => import("./pages/Packages"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Customers = lazy(() => import("./pages/Customers"));
const Staff = lazy(() => import("./pages/Staff"));
const Team = lazy(() => import("./pages/Team"));
const Profile = lazy(() => import("./pages/Profile"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const CustomerAuth = lazy(() => import("./pages/CustomerAuth"));
const MyAppointments = lazy(() => import("./pages/MyAppointments"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MovingLanding = lazy(() => import("./pages/MovingLanding"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const SuperAdmin = lazy(() => import("./pages/SuperAdmin"));
const SuperAdminOverview = lazy(() => import("./pages/super-admin/SuperAdminOverview"));
const SuperAdminBusinesses = lazy(() => import("./pages/super-admin/SuperAdminBusinesses"));
const SuperAdminPackages = lazy(() => import("./pages/super-admin/SuperAdminPackages"));
const SuperAdminCustomers = lazy(() => import("./pages/super-admin/SuperAdminCustomers"));
const SuperAdminAppointments = lazy(() => import("./pages/super-admin/SuperAdminAppointments"));
const SuperAdminPlans = lazy(() => import("./pages/super-admin/SuperAdminPlans"));
const SuperAdminSiteSettings = lazy(() => import("./pages/super-admin/SuperAdminSiteSettings"));
const SuperAdminReviews = lazy(() => import("./pages/super-admin/SuperAdminReviews"));
const SuperAdminBlog = lazy(() => import("./pages/super-admin/SuperAdminBlog"));

const PageLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min default - reduce refetches
      gcTime: 5 * 60_000, // 5 min (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<PageLoader />}>
      <PageTransition key={location.pathname}>
        <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/moving-demo" element={<MovingLanding />} />
        <Route path="/auth" element={<UnifiedAuth />} />
        <Route path="/business-auth" element={<Auth />} />
        <Route path="/customer-login" element={<CustomerAuth />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/book/:slug" element={<PublicBooking />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/super-admin" element={<SuperAdmin />}>
          <Route index element={<SuperAdminOverview />} />
          <Route path="businesses" element={<SuperAdminBusinesses />} />
          <Route path="packages" element={<SuperAdminPackages />} />
          <Route path="customers" element={<SuperAdminCustomers />} />
          <Route path="appointments" element={<SuperAdminAppointments />} />
          <Route path="plans" element={<SuperAdminPlans />} />
          <Route path="site-settings" element={<SuperAdminSiteSettings />} />
          <Route path="reviews" element={<SuperAdminReviews />} />
          <Route path="blog" element={<SuperAdminBlog />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<RequiresBusiness />}>
            <Route
              element={
                <SidebarProvider>
                  <DashboardLayout />
                </SidebarProvider>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/services" element={<Services />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/profile" element={<Profile />} />
              <Route element={<RequiresAdmin />}>
                <Route path="/packages" element={<Packages />} />
                <Route path="/coupons" element={<Coupons />} />
                <Route path="/team" element={<Team />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
        </Routes>
      </PageTransition>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
