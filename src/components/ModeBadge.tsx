import { useTheme } from '@/hooks/useTheme';

/**
 * Displays "Light Mode" or "Dark Mode" (orange pill) and auto‑updates
 * when the theme changes.
 */
export function ModeBadge() {
  const { theme } = useTheme();

  return (
    <span className="text-xs px-2 py-1 rounded-full bg-orange-400 text-white">
      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
    </span>
  );
}
