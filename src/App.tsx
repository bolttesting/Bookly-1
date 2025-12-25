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
import DashboardLayout from "./layouts/DashboardLayout";
import { PageTransition } from "@/components/PageTransition";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Services from "./pages/Services";
import Packages from "./pages/Packages";
import Coupons from "./pages/Coupons";
import Customers from "./pages/Customers";
import Staff from "./pages/Staff";
import Team from "./pages/Team";
import SuperAdmin from "./pages/SuperAdmin";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import PublicBooking from "./pages/PublicBooking";
import CustomerAuth from "./pages/CustomerAuth";
import UnifiedAuth from "./pages/UnifiedAuth";
import MyAppointments from "./pages/MyAppointments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();

  return (
    <PageTransition key={location.pathname}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<UnifiedAuth />} />
        <Route path="/business-auth" element={<Auth />} />
        <Route path="/customer-login" element={<CustomerAuth />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/book/:slug" element={<PublicBooking />} />
        <Route path="/super-admin" element={<SuperAdmin />} />
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
              <Route path="/packages" element={<Packages />} />
              <Route path="/coupons" element={<Coupons />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/team" element={<Team />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
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
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
