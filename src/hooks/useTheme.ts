import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'leet-tracker-theme';

/**
 * Get the user's system theme preference
 */
function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get the stored theme preference, defaulting to system preference
 */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
  return stored || getSystemTheme(); // Default to system preference if no stored value
}

/**
 * Apply the theme to the document element
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Initialize theme immediately (before React renders) to prevent flash
 */
export function initializeTheme() {
  if (typeof window === 'undefined') return;

  const theme = getStoredTheme();
  applyTheme(theme);
}

// Global state management for theme
let globalTheme: Theme = getStoredTheme();
const listeners: Set<(_theme: Theme) => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener(globalTheme));
}

function setGlobalTheme(theme: Theme) {
  globalTheme = theme;
  applyTheme(theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  notifyListeners();
}

/**
 * Hook for managing theme state
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(globalTheme);

  useEffect(() => {
    // Add this component as a listener
    const listener = (newTheme: Theme) => {
      setTheme(newTheme);
    };

    listeners.add(listener);

    // Clean up listener on unmount
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = globalTheme === 'dark' ? 'light' : 'dark';
    setGlobalTheme(newTheme);
  };

  const setThemePreference = (newTheme: Theme) => {
    setGlobalTheme(newTheme);
  };

  return {
    theme,
    resolvedTheme: theme, // Same as theme now since we removed system
    toggleTheme,
    setTheme: setThemePreference,
    isDark: theme === 'dark',
  };
}
