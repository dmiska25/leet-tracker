import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExtensionPoller } from './useExtensionPoller';
import {
  startPolling,
  stopPolling,
  triggerManualSync,
  SOLVES_UPDATED_EVENT,
} from '../domain/extensionPoller';

vi.mock('../domain/extensionPoller', () => ({
  startPolling: vi.fn(),
  stopPolling: vi.fn(),
  triggerManualSync: vi.fn(),
  SOLVES_UPDATED_EVENT: 'solves-updated',
}));

describe('useExtensionPoller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(triggerManualSync).mockResolvedValue(0);
  });

  describe('polling lifecycle', () => {
    it('starts polling on mount and stops on unmount', () => {
      const { unmount } = renderHook(() => useExtensionPoller());

      expect(startPolling).toHaveBeenCalledTimes(1);
      expect(stopPolling).not.toHaveBeenCalled();

      unmount();

      expect(stopPolling).toHaveBeenCalledTimes(1);
    });

    it('does not start polling when autoStart is false', () => {
      const { unmount } = renderHook(() => useExtensionPoller({ autoStart: false }));

      expect(startPolling).not.toHaveBeenCalled();
      expect(stopPolling).not.toHaveBeenCalled();

      unmount();

      expect(stopPolling).not.toHaveBeenCalled();
    });

    it('starts polling when autoStart changes from false to true', () => {
      const { rerender } = renderHook(({ autoStart }) => useExtensionPoller({ autoStart }), {
        initialProps: { autoStart: false },
      });

      expect(startPolling).not.toHaveBeenCalled();

      rerender({ autoStart: true });

      expect(startPolling).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handling', () => {
    it('invokes callback when solves-updated event is fired', async () => {
      const onSolvesUpdated = vi.fn();

      renderHook(() => useExtensionPoller({ onSolvesUpdated }));

      // Simulate the extension poller emitting the event
      window.dispatchEvent(
        new CustomEvent(SOLVES_UPDATED_EVENT, {
          detail: { count: 3 },
        }),
      );

      await waitFor(() => {
        expect(onSolvesUpdated).toHaveBeenCalledWith(3);
      });
    });

    it('does not invoke callback if not provided', async () => {
      renderHook(() => useExtensionPoller());

      // Should not throw even without callback
      window.dispatchEvent(
        new CustomEvent(SOLVES_UPDATED_EVENT, {
          detail: { count: 5 },
        }),
      );

      // Give async handlers time to process
      await Promise.resolve();
      // Test passes if no error is thrown
    });

    it('removes event listener on unmount', async () => {
      const onSolvesUpdated = vi.fn();

      const { unmount } = renderHook(() => useExtensionPoller({ onSolvesUpdated }));

      unmount();

      // Fire event after unmount
      window.dispatchEvent(
        new CustomEvent(SOLVES_UPDATED_EVENT, {
          detail: { count: 2 },
        }),
      );

      // Callback should NOT be called
      expect(onSolvesUpdated).not.toHaveBeenCalled();
    });

    it('updates event listener when callback changes', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      const { rerender } = renderHook(
        ({ onSolvesUpdated }) => useExtensionPoller({ onSolvesUpdated }),
        { initialProps: { onSolvesUpdated: callback1 } },
      );

      // Fire event with first callback
      window.dispatchEvent(
        new CustomEvent(SOLVES_UPDATED_EVENT, {
          detail: { count: 1 },
        }),
      );

      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(1);
      });

      // Change callback
      rerender({ onSolvesUpdated: callback2 });

      // Fire event with second callback
      window.dispatchEvent(
        new CustomEvent(SOLVES_UPDATED_EVENT, {
          detail: { count: 2 },
        }),
      );

      await waitFor(() => {
        expect(callback2).toHaveBeenCalledWith(2);
      });

      // First callback should only have been called once
      expect(callback1).toHaveBeenCalledTimes(1);
    });
  });

  describe('triggerSync', () => {
    it('calls triggerManualSync when invoked', async () => {
      vi.mocked(triggerManualSync).mockResolvedValue(5);

      const { result } = renderHook(() => useExtensionPoller());

      const count = await result.current.triggerSync();

      expect(triggerManualSync).toHaveBeenCalledTimes(1);
      expect(count).toBe(5);
    });

    it('returns the same function reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useExtensionPoller());

      const triggerSync1 = result.current.triggerSync;

      rerender();

      const triggerSync2 = result.current.triggerSync;

      expect(triggerSync1).toBe(triggerSync2); // Same reference
    });

    it('handles errors from triggerManualSync', async () => {
      vi.mocked(triggerManualSync).mockResolvedValue(-1);

      const { result } = renderHook(() => useExtensionPoller());

      const count = await result.current.triggerSync();

      expect(count).toBe(-1);
    });
  });

  describe('multiple instances', () => {
    it('allows multiple hook instances without conflicts', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      renderHook(() => useExtensionPoller({ onSolvesUpdated: callback1 }));
      renderHook(() => useExtensionPoller({ onSolvesUpdated: callback2 }));

      // Both should start polling
      expect(startPolling).toHaveBeenCalledTimes(2);

      // Fire event - both callbacks should be invoked
      window.dispatchEvent(
        new CustomEvent(SOLVES_UPDATED_EVENT, {
          detail: { count: 4 },
        }),
      );

      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(4);
        expect(callback2).toHaveBeenCalledWith(4);
      });
    });
  });
});
