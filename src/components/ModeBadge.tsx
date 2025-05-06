import { useEffect, useState } from 'react';

/**
 * Displays "Light Mode” or "Dark Mode” (orange pill) and auto‑updates
 * whenever the `dark` class on <html> changes.
 */
export function ModeBadge() {
  // Helper – returns true if the root element currently has the `dark` class
  const isDark = () =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const [dark, setDark] = useState<boolean>(isDark());

  useEffect(() => {
    // Watch for class changes on <html> so the pill updates immediately
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <span className="text-xs px-2 py-1 rounded-full bg-orange-400 text-white">
      {dark ? 'Dark Mode' : 'Light Mode'}
    </span>
  );
}
