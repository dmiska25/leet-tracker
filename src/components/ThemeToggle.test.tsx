import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

import { ThemeToggle } from './ThemeToggle';
import { ModeBadge } from './ModeBadge';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false, // Default to light mode
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
});

describe('ThemeToggle & ModeBadge', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    document.documentElement.className = '';
  });

  it('shows correct initial theme state', async () => {
    render(
      <>
        <ThemeToggle />
        <ModeBadge />
      </>,
    );

    // Should start with light mode (system default in test)
    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });

  it('theme toggle switches between light and dark', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeToggle />
        <ModeBadge />
      </>,
    );

    // Should start with light mode
    expect(screen.getByText('Light Mode')).toBeInTheDocument();

    // Click to toggle to dark
    const button = screen.getByRole('button', { name: /toggle theme/i });
    await user.click(button);

    // Should now be dark mode
    await waitFor(() => {
      expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    });

    // Click again to toggle back to light
    await user.click(button);

    // Should be back to light mode
    await waitFor(() => {
      expect(screen.getByText('Light Mode')).toBeInTheDocument();
    });
  });
});
