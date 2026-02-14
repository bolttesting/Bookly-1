import { Outlet } from "react-router-dom";
import { SuperAdminSidebar } from "@/components/SuperAdminSidebar";
import { SuperAdminHeader } from "@/components/SuperAdminHeader";
import { SidebarInset } from "@/components/ui/sidebar";
import { PageTransition } from "@/components/PageTransition";
import { useLocation } from "react-router-dom";

interface SuperAdminLayoutProps {
  onChangePasswordClick?: () => void;
}

export default function SuperAdminLayout({ onChangePasswordClick }: SuperAdminLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <SuperAdminSidebar />
      <SidebarInset className="flex flex-col flex-1 min-w-0 overflow-hidden h-full">
        <SuperAdminHeader onChangePasswordClick={onChangePasswordClick} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 scrollbar-thin min-w-0 max-w-full">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </div>
      </SidebarInset>
    </div>
  );
}
