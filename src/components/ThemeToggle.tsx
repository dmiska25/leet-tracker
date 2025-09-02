import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { toggleTheme, theme } = useTheme();

  const getAriaLabel = () => {
    return `Toggle theme (currently ${theme} mode)`;
  };

  return (
    <Button
      variant="outline"
      aria-label={getAriaLabel()}
      className="flex items-center gap-2 h-8 px-3"
      onClick={toggleTheme}
    >
      {theme === 'dark' ? (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-sm">Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-sm">Light Mode</span>
        </>
      )}
    </Button>
  );
}
