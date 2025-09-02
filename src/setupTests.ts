import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';
import React from 'react';

// Mock PostHog to prevent browser API issues in tests
vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock matchMedia for theme detection tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false, // Default to light theme in tests
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for tests (used by react-tooltip)
Object.defineProperty(globalThis, 'ResizeObserver', {
  value: class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(_callback: any) {
      // Constructor can be empty for tests
    }
  },
});

// Mock localStorage for tests
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    store: {} as Record<string, string>,
    getItem(key: string) {
      return this.store[key] || null;
    },
    setItem(key: string, value: string) {
      this.store[key] = String(value);
    },
    removeItem(key: string) {
      delete this.store[key];
    },
    clear() {
      this.store = {};
    },
  },
  writable: true,
  configurable: true,
});
