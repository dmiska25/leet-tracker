import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';

// Mock localStorage first, before importing the hook
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock matchMedia first, before importing the hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Now import the hook after mocks are set up
import { useTheme, initializeTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    document.documentElement.className = '';

    // Reset matchMedia to default behavior
    (window.matchMedia as any).mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('theme toggling', () => {
    it('should toggle theme from light to dark', () => {
      const { result } = renderHook(() => useTheme());

      // Initially should be light (or whatever the current state is)
      const initialTheme = result.current.theme;

      act(() => {
        result.current.toggleTheme();
      });

      // Should have changed to the opposite
      expect(result.current.theme).not.toBe(initialTheme);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should toggle back to original theme', () => {
      const { result } = renderHook(() => useTheme());

      const initialTheme = result.current.theme;

      // Toggle twice should return to original
      act(() => {
        result.current.toggleTheme();
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe(initialTheme);
    });
  });

  describe('setTheme functionality', () => {
    it('should set theme to dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDark).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('leet-tracker-theme', 'dark');
    });

    it('should set theme to light', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDark).toBe(false);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('leet-tracker-theme', 'light');
    });
  });

  describe('DOM updates', () => {
    it('should add dark class when theme is dark', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when theme is light', () => {
      const { result } = renderHook(() => useTheme());

      // Set to dark first
      act(() => {
        result.current.setTheme('dark');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(true);

      // Then set to light
      act(() => {
        result.current.setTheme('light');
      });

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('hook properties', () => {
    it('should have resolvedTheme equal to theme', () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe(result.current.resolvedTheme);

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe(result.current.resolvedTheme);
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should have correct isDark property', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.isDark).toBe(false);
    });
  });

  describe('multiple hook instances synchronization', () => {
    it('should synchronize theme changes across multiple instances', () => {
      const { result: hook1 } = renderHook(() => useTheme());
      const { result: hook2 } = renderHook(() => useTheme());

      // Both should start with the same theme
      expect(hook1.current.theme).toBe(hook2.current.theme);

      const initialTheme = hook1.current.theme;

      act(() => {
        hook1.current.toggleTheme();
      });

      // Both hooks should have the same new theme (opposite of initial)
      expect(hook1.current.theme).toBe(hook2.current.theme);
      expect(hook1.current.theme).not.toBe(initialTheme);
    });

    it('should synchronize setTheme calls across multiple instances', () => {
      const { result: hook1 } = renderHook(() => useTheme());
      const { result: hook2 } = renderHook(() => useTheme());

      act(() => {
        hook2.current.setTheme('dark');
      });

      // Both hooks should reflect the change
      expect(hook1.current.theme).toBe('dark');
      expect(hook2.current.theme).toBe('dark');
      expect(hook1.current.isDark).toBe(true);
      expect(hook2.current.isDark).toBe(true);
    });
  });

  describe('initializeTheme function', () => {
    it('should exist and be callable', () => {
      // Just verify the function exists and doesn't throw
      expect(typeof initializeTheme).toBe('function');
      expect(() => initializeTheme()).not.toThrow();
    });

    it('should apply dark theme to document when dark theme is stored', () => {
      mockLocalStorage.getItem.mockReturnValue('dark');

      initializeTheme();

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not add dark class when light theme is stored', () => {
      mockLocalStorage.getItem.mockReturnValue('light');

      initializeTheme();

      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should save theme changes to localStorage', () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('leet-tracker-theme', 'dark');

      act(() => {
        result.current.setTheme('light');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('leet-tracker-theme', 'light');
    });
  });
});
