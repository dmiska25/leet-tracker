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
      className="relative h-8 w-8 p-0 flex items-center justify-center"
      onClick={toggleTheme}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
