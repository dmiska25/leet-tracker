import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startPolling,
  stopPolling,
  triggerManualSync,
  getPollingState,
  _resetForTesting,
  SOLVES_UPDATED_EVENT,
} from './extensionPoller';
import { syncSolveData } from './syncSolveData';
import { db } from '@/storage/db';

vi.mock('./syncSolveData');
vi.mock('@/storage/db');

describe('extensionPoller', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetForTesting();
    vi.useFakeTimers();
    vi.mocked(syncSolveData).mockResolvedValue(0);
    vi.mocked(db.getUsername).mockResolvedValue('testuser');
  });

  afterEach(() => {
    stopPolling();
    vi.useRealTimers();
  });

  describe('startPolling', () => {
    it('starts polling and performs immediate sync', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(0);
      startPolling();

      // Should perform immediate sync on start - flush microtasks without advancing time
      await vi.advanceTimersByTimeAsync(0);
      expect(syncSolveData).toHaveBeenCalledTimes(1);

      const state = getPollingState();
      expect(state.intervalId).not.toBeNull();
    });

    it('performs sync every 10 seconds', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(0);
      startPolling();

      // Initial sync - wait for promises (getUsername + syncSolveData)
      await vi.advanceTimersByTimeAsync(0);
      expect(syncSolveData).toHaveBeenCalledTimes(1);

      // Advance 10 seconds - should sync again
      await vi.advanceTimersByTimeAsync(10000);
      expect(syncSolveData).toHaveBeenCalledTimes(2);

      // Advance another 10 seconds
      await vi.advanceTimersByTimeAsync(10000);
      expect(syncSolveData).toHaveBeenCalledTimes(3);
    });

    it('does nothing if already polling', () => {
      startPolling();
      const state1 = getPollingState();

      startPolling(); // Try to start again
      const state2 = getPollingState();

      // Should be the same interval ID
      expect(state1.intervalId).toBe(state2.intervalId);
    });
  });

  describe('stopPolling', () => {
    it('stops the polling interval', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(0);
      startPolling();

      // Initial sync - flush microtasks without advancing time
      await vi.advanceTimersByTimeAsync(0);
      expect(syncSolveData).toHaveBeenCalledTimes(1);

      stopPolling();

      // Advance time - should not sync anymore
      await vi.advanceTimersByTimeAsync(10000);
      expect(syncSolveData).toHaveBeenCalledTimes(1); // Still 1, no new syncs

      const state = getPollingState();
      expect(state.intervalId).toBeNull();
    });

    it('does nothing if not currently polling', () => {
      stopPolling(); // Should not throw
      expect(getPollingState().intervalId).toBeNull();
    });
  });

  describe('triggerManualSync', () => {
    it('performs a sync outside the polling schedule', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(3);

      const result = await triggerManualSync();

      expect(result).toBe(3);
      expect(syncSolveData).toHaveBeenCalledTimes(1);
    });

    it('returns the count from syncSolveData', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(5);

      const count = await triggerManualSync();

      expect(count).toBe(5);
    });

    it('returns -1 on error', async () => {
      vi.mocked(syncSolveData).mockRejectedValue(new Error('Extension unavailable'));

      const count = await triggerManualSync();

      expect(count).toBe(-1);
    });
  });

  describe('overlapping sync prevention', () => {
    it('prevents overlapping syncs during polling', async () => {
      // Make syncSolveData take a long time (longer than polling interval)
      let resolveSync: (_value: number) => void;
      const longSync = new Promise<number>((resolve) => {
        resolveSync = resolve;
      });
      vi.mocked(syncSolveData).mockReturnValueOnce(longSync);

      startPolling();

      // Initial sync starts (but doesn't complete yet)
      await vi.advanceTimersByTimeAsync(0); // Let the sync start without advancing time
      expect(syncSolveData).toHaveBeenCalledTimes(1);

      // Advance 10 seconds - should attempt another sync
      await vi.advanceTimersByTimeAsync(10000);

      // Should still be only 1 call (second attempt was skipped due to overlap)
      expect(syncSolveData).toHaveBeenCalledTimes(1);

      // Now resolve the first sync and set up next sync to complete quickly
      vi.mocked(syncSolveData).mockResolvedValueOnce(0);
      resolveSync!(0);
      await vi.advanceTimersByTimeAsync(0); // Let promises resolve without advancing time

      // Advance another 10 seconds - should now sync again
      await vi.advanceTimersByTimeAsync(10000);
      expect(syncSolveData).toHaveBeenCalledTimes(2);
    });

    it('allows manual sync even if polling sync is in progress', async () => {
      // Make syncSolveData take a long time
      let resolveSync: (_value: number) => void;
      const longSync = new Promise<number>((resolve) => {
        resolveSync = resolve;
      });
      vi.mocked(syncSolveData).mockReturnValueOnce(longSync);

      startPolling();

      // Initial sync starts
      await vi.advanceTimersByTimeAsync(0); // Let the sync start without advancing time
      expect(syncSolveData).toHaveBeenCalledTimes(1);

      // Try manual sync while first is still in progress
      const manualPromise = triggerManualSync();

      // Should be skipped (returns 0 immediately)
      const result = await manualPromise;
      expect(result).toBe(0);
      expect(syncSolveData).toHaveBeenCalledTimes(1); // Still just the first call

      // Resolve the original sync
      resolveSync!(2);
      await vi.advanceTimersByTimeAsync(0);
    });
  });

  describe('event emission', () => {
    it('emits solves-updated event when new solves are added', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(3);

      const eventListener = vi.fn();
      window.addEventListener(SOLVES_UPDATED_EVENT, eventListener);

      await triggerManualSync();

      expect(eventListener).toHaveBeenCalledTimes(1);
      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { count: 3 },
        }),
      );

      window.removeEventListener(SOLVES_UPDATED_EVENT, eventListener);
    });

    it('does not emit event when no new solves are added', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(0);

      const eventListener = vi.fn();
      window.addEventListener(SOLVES_UPDATED_EVENT, eventListener);

      await triggerManualSync();

      expect(eventListener).not.toHaveBeenCalled();

      window.removeEventListener(SOLVES_UPDATED_EVENT, eventListener);
    });

    it('does not emit event on sync error', async () => {
      vi.mocked(syncSolveData).mockRejectedValue(new Error('Extension error'));

      const eventListener = vi.fn();
      window.addEventListener(SOLVES_UPDATED_EVENT, eventListener);

      await triggerManualSync();

      expect(eventListener).not.toHaveBeenCalled();

      window.removeEventListener(SOLVES_UPDATED_EVENT, eventListener);
    });
  });

  describe('getPollingState', () => {
    it('returns current state', async () => {
      const state1 = getPollingState();
      expect(state1.intervalId).toBeNull();
      expect(state1.isPolling).toBe(false);

      startPolling();
      await vi.runOnlyPendingTimersAsync();

      const state2 = getPollingState();
      expect(state2.intervalId).not.toBeNull();
    });

    it('returns immutable copy of state', () => {
      const state = getPollingState();
      // Trying to modify should not affect internal state
      (state as any).intervalId = 12345;

      const state2 = getPollingState();
      expect(state2.intervalId).not.toBe(12345);
    });
  });

  describe('lastSyncTime tracking', () => {
    it('updates lastSyncTime after successful sync', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(1);

      const stateBefore = getPollingState();
      expect(stateBefore.lastSyncTime).toBe(0);

      await triggerManualSync();

      const stateAfter = getPollingState();
      expect(stateAfter.lastSyncTime).toBeGreaterThan(0);
    });

    it('tracks lastSyncTime across multiple syncs', async () => {
      vi.mocked(syncSolveData).mockResolvedValue(0);

      await triggerManualSync();
      const time1 = getPollingState().lastSyncTime;

      // Advance time and sync again
      await vi.advanceTimersByTimeAsync(5000);
      await triggerManualSync();
      const time2 = getPollingState().lastSyncTime;

      expect(time2).toBeGreaterThan(time1);
    });
  });
});
