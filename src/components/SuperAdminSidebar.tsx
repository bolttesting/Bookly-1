import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  Calendar,
  CreditCard,
  Settings,
  Star,
  FileText,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";
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
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

const navItems = [
  { title: "Overview", url: "/super-admin", end: true, icon: LayoutDashboard },
  { title: "Businesses", url: "/super-admin/businesses", end: false, icon: Building2 },
  { title: "Packages", url: "/super-admin/packages", end: false, icon: Package },
  { title: "Customers", url: "/super-admin/customers", end: false, icon: Users },
  { title: "Appointments", url: "/super-admin/appointments", end: false, icon: Calendar },
  { title: "Plans & Stripe", url: "/super-admin/plans", end: false, icon: CreditCard },
  { title: "Site Settings", url: "/super-admin/site-settings", end: false, icon: Settings },
  { title: "Reviews", url: "/super-admin/reviews", end: false, icon: Star },
  { title: "Blog", url: "/super-admin/blog", end: false, icon: FileText },
];

export function SuperAdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className="border-r border-sidebar-border bg-sidebar"
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow">
            <ShieldAlert className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-foreground">
                Super Admin
              </span>
              <span className="text-xs text-muted-foreground">
                Platform Control
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 flex-1 min-h-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={false}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )
                      }
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 shrink-0 border-t border-sidebar-border">
        {!collapsed && (
          <Button variant="outline" className="w-full justify-start gap-2" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
