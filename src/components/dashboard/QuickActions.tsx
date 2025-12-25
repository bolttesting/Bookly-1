import { Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QuickActions() {
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm">
        <Calendar className="h-4 w-4 mr-2" />
        View Calendar
      </Button>
      <Button className="animated-gradient text-primary-foreground" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        New Booking
      </Button>
    </div>
  );
}
