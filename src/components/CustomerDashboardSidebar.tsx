import { AppLogoMark } from '@/components/brand/AppLogo';
import {
  CalendarPlus,
  Calendar,
  Briefcase,
  Package,
  ShoppingBag,
  User,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export type CustomerDashboardTab = "appointments" | "services" | "packages" | "my-packages" | "profile";

const navItems: { id: CustomerDashboardTab; title: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "appointments", title: "Appointments", icon: Calendar },
  { id: "services", title: "Book Service", icon: CalendarPlus },
  { id: "packages", title: "Buy Package", icon: Briefcase },
  { id: "my-packages", title: "My Packages", icon: ShoppingBag },
  { id: "profile", title: "Profile", icon: User },
];

interface CustomerDashboardSidebarProps {
  activeTab: CustomerDashboardTab;
  onTabChange: (tab: CustomerDashboardTab) => void;
}

export function CustomerDashboardSidebar({ activeTab, onTabChange }: CustomerDashboardSidebarProps) {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleSelect = (id: CustomerDashboardTab) => {
    onTabChange(id);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar"
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className={cn('flex min-w-0 items-center gap-3', collapsed && 'justify-center')}>
          <AppLogoMark decorative={!collapsed} className="h-10 w-10 shrink-0 glow" />
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-display text-lg font-bold text-foreground">Bookly</span>
              <span className="text-xs text-muted-foreground">Appointments & bookings</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 flex-1 min-h-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <SidebarMenuItem key={item.id} className="min-w-0">
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 min-w-0 w-full cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
