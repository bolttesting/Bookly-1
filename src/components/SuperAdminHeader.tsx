import { Menu, KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface SuperAdminHeaderProps {
  onChangePasswordClick?: () => void;
}

export function SuperAdminHeader({ onChangePasswordClick }: SuperAdminHeaderProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Menu className="h-5 w-5" />
        </SidebarTrigger>
        <h2 className="text-lg font-semibold truncate">Super Admin</h2>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onChangePasswordClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onChangePasswordClick}
            className="gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Change password
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
