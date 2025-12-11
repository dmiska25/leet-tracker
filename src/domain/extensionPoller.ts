/**
 * Background polling system for extension sync.
 *
 * This module provides automatic background polling of the Chrome extension
 * every 10 seconds to check for new solve data.
 *
 * Key features:
 * - Automatic 10-second polling interval
 * - Prevention of overlapping syncs
 * - CustomEvent emission for component updates
 * - Manual sync API for user-triggered refreshes
 * - Proper cleanup on stop
 */

import { syncFromExtension } from './extensionSync';
import { db } from '@/storage/db';

// Event name for notifying components of new solves
export const SOLVES_UPDATED_EVENT = 'solves-updated';

interface PollerState {
  intervalId: number | null;
  isPolling: boolean;
  lastSyncTime: number;
}

const state: PollerState = {
  intervalId: null,
  isPolling: false,
  lastSyncTime: 0,
};

/**
 * Start background polling every 10 seconds.
 * Does nothing if polling is already active.
 */
export function startPolling(): void {
  if (state.intervalId !== null) {
    console.log('[extensionPoller] Already polling');
    return;
  }

  console.log('[extensionPoller] Starting background polling (10s interval)');

  // Do an immediate sync on start
  performSync();

  // Then poll every 10 seconds
  state.intervalId = window.setInterval(() => {
    performSync();
  }, 10000); // 10 seconds
}

/**
 * Stop background polling and cleanup.
 */
export function stopPolling(): void {
  if (state.intervalId === null) {
    console.log('[extensionPoller] Not currently polling');
    return;
  }

  console.log('[extensionPoller] Stopping background polling');
  window.clearInterval(state.intervalId);
  state.intervalId = null;
  state.isPolling = false;
}

/**
 * Manually trigger a sync outside the polling schedule.
 * Useful for user-triggered refresh actions.
 *
 * @returns Promise resolving to the number of new solves added (or -1 on error)
 */
export async function triggerManualSync(): Promise<number> {
  console.log('[extensionPoller] Manual sync triggered');
  return performSync();
}

/**
 * Internal function to perform the actual sync.
 * Prevents overlapping syncs and emits update events.
 */
async function performSync(): Promise<number> {
  // Prevent overlapping syncs
  if (state.isPolling) {
    console.log('[extensionPoller] Sync already in progress, skipping');
    return 0;
  }

  state.isPolling = true;
  const startTime = Date.now();

  try {
    // Get the current username before syncing
    const username = await db.getUsername();
    if (!username) {
      console.log('[extensionPoller] No username set, skipping sync');
      return 0;
    }

    const newSolvesCount = await syncFromExtension(username);
    state.lastSyncTime = Date.now();

    const duration = Date.now() - startTime;
    console.log(`[extensionPoller] Sync complete: ${newSolvesCount} new solves (${duration}ms)`);

    // Emit event if new solves were added
    if (newSolvesCount > 0) {
      window.dispatchEvent(
        new CustomEvent(SOLVES_UPDATED_EVENT, {
          detail: { count: newSolvesCount },
        }),
      );
    }

    return newSolvesCount;
  } catch (error) {
    console.error('[extensionPoller] Sync error:', error);
    return -1;
  } finally {
    state.isPolling = false;
  }
}

/**
 * Get the current polling state (for debugging/testing).
 */
export function getPollingState(): Readonly<PollerState> {
  return { ...state };
}

/**
 * Reset the poller state (for testing only).
 * @internal
 */
export function _resetForTesting(): void {
  if (state.intervalId !== null) {
    window.clearInterval(state.intervalId);
  }
  state.intervalId = null;
  state.isPolling = false;
  state.lastSyncTime = 0;
}
