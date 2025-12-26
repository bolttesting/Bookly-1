import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SidebarInset } from "@/components/ui/sidebar";
import { PageTransition } from "@/components/PageTransition";

const DashboardLayout = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden h-full">
        <DashboardHeader className="shrink-0" />
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 scrollbar-thin min-w-0">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </div>
      </SidebarInset>
    </div>
  );
};

export default DashboardLayout;
