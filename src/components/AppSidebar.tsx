import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  Users,
  UserCircle,
  Settings,
  Sparkles,
  Shield,
  Package,
  Tag,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useBusinessSubscription } from "@/hooks/useBusinessSubscription";
import { useDashboardRole } from "@/hooks/useDashboardRole";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { title: "Calendar", url: "/calendar", icon: Calendar, adminOnly: false },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck, adminOnly: false },
  { title: "Services", url: "/services", icon: Briefcase, adminOnly: false },
  { title: "Packages", url: "/packages", icon: Package, adminOnly: true },
  { title: "Coupons", url: "/coupons", icon: Tag, adminOnly: true },
  { title: "Customers", url: "/customers", icon: Users, adminOnly: false },
  { title: "Staff", url: "/staff", icon: UserCircle, adminOnly: false },
  { title: "Team", url: "/team", icon: Shield, adminOnly: true },
  { title: "Analytics", url: "/analytics", icon: BarChart3, adminOnly: true },
  { title: "Settings", url: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { subscription, isLoading: subscriptionLoading } = useBusinessSubscription();
  const { canAccessAdmin, isLoading } = useDashboardRole();

  // Default to showing all items while role is loading (avoids flash of hidden nav)
  const visibleNavItems = isLoading
    ? navItems
    : navItems.filter((item) => !item.adminOnly || canAccessAdmin);
  
  // Only show upgrade button if on free plan (price = 0)
  // Default to showing upgrade button if subscription data isn't loaded yet or plan is null
  const isFreePlan = !subscription?.plan || (subscription.plan?.price ?? 0) === 0;

  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar"
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-foreground">
                Bookly
              </span>
              <span className="text-xs text-muted-foreground">
                Smart Scheduling
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 flex-1 min-h-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 shrink-0 border-t border-sidebar-border">
        {!collapsed && canAccessAdmin && (
          <div className="glass-card p-4 text-center">
            {subscriptionLoading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : isFreePlan ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Upgrade to Pro for more features
                </p>
                <button 
                  onClick={() => navigate("/settings?tab=payments")}
                  className="w-full py-2 px-4 rounded-lg text-sm font-medium animated-gradient text-primary-foreground transition-all hover:opacity-90"
                >
                  Upgrade Now
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Current Plan
                </p>
                <Badge variant="outline" className="w-full justify-center py-2 text-sm font-medium">
                  {subscription.plan?.name || 'Pro'}
                </Badge>
              </>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
