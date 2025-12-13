/**
 * React hook for extension polling integration.
 *
 * This hook provides easy integration of the extension poller into React
 * components. It handles:
 * - Automatic polling start/stop based on component lifecycle
 * - Event listener management for solve updates
 * - Manual sync triggering
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { triggerSync } = useExtensionPoller({
 *     onSolvesUpdated: (count) => {
 *       console.log(`${count} new solves!`);
 *       // Refresh UI state...
 *     }
 *   });
 *
 *   return <button onClick={triggerSync}>Refresh</button>;
 * }
 * ```
 */

import { useEffect, useCallback } from 'react';
import {
  startPolling,
  stopPolling,
  triggerManualSync,
  SOLVES_UPDATED_EVENT,
} from '../domain/extensionPoller';

interface UseExtensionPollerOptions {
  /**
   * Callback invoked when new solves are detected.
   * @param _count Number of new solves added
   */
  onSolvesUpdated?: (_count: number) => void;

  /**
   * Whether to automatically start polling on mount.
   * @default true
   */
  autoStart?: boolean;
}

interface UseExtensionPollerResult {
  /**
   * Manually trigger a sync outside the polling schedule.
   * Useful for user-triggered refresh actions.
   *
   * @returns Promise resolving to the number of new solves (or -1 on error)
   */
  triggerSync: () => Promise<number>;
}

/**
 * Hook for managing extension polling in React components.
 *
 * Automatically starts polling on mount and stops on unmount.
 * Listens for solve update events and invokes the callback.
 */
export function useExtensionPoller(
  options: UseExtensionPollerOptions = {},
): UseExtensionPollerResult {
  const { onSolvesUpdated, autoStart = true } = options;

  // Start/stop polling on mount/unmount
  useEffect(() => {
    if (!autoStart) return;

    startPolling();
    return () => {
      stopPolling();
    };
  }, [autoStart]);

  // Listen for solve update events
  useEffect(() => {
    if (!onSolvesUpdated) return;

    const handleSolvesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ count: number }>;
      onSolvesUpdated(customEvent.detail.count);
    };

    window.addEventListener(SOLVES_UPDATED_EVENT, handleSolvesUpdated);

    return () => {
      window.removeEventListener(SOLVES_UPDATED_EVENT, handleSolvesUpdated);
    };
  }, [onSolvesUpdated]);

  // Memoize the manual sync function
  const triggerSync = useCallback(async () => {
    return triggerManualSync();
  }, []);

  return { triggerSync };
}
