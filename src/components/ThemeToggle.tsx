import { Sun, Moon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex items-center gap-2">
      <Sun className={`h-4 w-4 transition-colors ${isDark ? 'text-muted-foreground' : 'text-foreground'}`} />
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Toggle theme"
        className="data-[state=checked]:bg-primary"
      />
      <Moon className={`h-4 w-4 transition-colors ${isDark ? 'text-foreground' : 'text-muted-foreground'}`} />
    </div>
  );
}

