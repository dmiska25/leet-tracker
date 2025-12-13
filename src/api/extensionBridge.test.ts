import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getManifestSince, getChunk, ExtensionUnavailable } from './extensionBridge';

describe('extensionBridge', () => {
  let originalPostMessage: typeof window.postMessage;

  beforeEach(() => {
    originalPostMessage = window.postMessage;
    window.postMessage = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.postMessage = originalPostMessage;
  });

  describe('getManifestSince', () => {
    it('resolves with manifest object when extension responds correctly', async () => {
      const mockResponse = {
        source: 'leettracker-extension',
        type: 'response_chunk_manifest',
        username: 'testuser',
        chunks: [{ index: 0, from: 0, to: 1234567890 }],
        total: 100,
        totalSynced: 50,
      };

      const mockEventListener = vi.fn((eventType, handler) => {
        if (eventType === 'message') {
          setTimeout(() => handler({ data: mockResponse }), 10);
        }
      });

      window.addEventListener = mockEventListener as any;

      const promise = getManifestSince('testuser', 0);
      await vi.advanceTimersByTimeAsync(50); // Advance past the response delay
      const manifest = await promise;

      expect(manifest).toEqual({
        chunks: [{ index: 0, from: 0, to: 1234567890 }],
        total: 100,
        totalSynced: 50,
      });
      expect(window.postMessage).toHaveBeenCalledWith(
        {
          type: 'request_chunk_manifest_since',
          username: 'testuser',
          since: 0,
          source: 'leettracker-webapp',
        },
        '*',
      );
    });

    it('rejects with ExtensionUnavailable if no response is received within timeout', async () => {
      const mockEventListener = vi.fn();

      window.addEventListener = mockEventListener as any;

      const promise = getManifestSince('testuser', 0);

      // Catch the rejection to prevent unhandled promise rejection
      promise.catch(() => {
        // Expected rejection, ignore
      });

      // Run all pending timers to trigger all retry attempts
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(ExtensionUnavailable);

      expect(window.postMessage).toHaveBeenCalledWith(
        {
          type: 'request_chunk_manifest_since',
          username: 'testuser',
          since: 0,
          source: 'leettracker-webapp',
        },
        '*',
      );
    }, 10000); // Increase timeout for this test with fake timers
  });

  describe('getChunk', () => {
    it('resolves with chunk data when extension responds correctly', async () => {
      const mockResponse = {
        source: 'leettracker-extension',
        type: 'response_chunk',
        username: 'testuser',
        index: 0,
        data: [{ titleSlug: 'two-sum', timestamp: 1234567890 }],
      };

      const mockEventListener = vi.fn((eventType, handler) => {
        if (eventType === 'message') {
          setTimeout(() => handler({ data: mockResponse }), 10);
        }
      });

      window.addEventListener = mockEventListener as any;

      const promise = getChunk('testuser', 0);
      await vi.advanceTimersByTimeAsync(50); // Advance past the response delay
      const chunk = await promise;

      expect(chunk).toEqual([{ titleSlug: 'two-sum', timestamp: 1234567890 }]);
      expect(window.postMessage).toHaveBeenCalledWith(
        {
          type: 'request_chunk_by_index',
          username: 'testuser',
          index: 0,
          source: 'leettracker-webapp',
        },
        '*',
      );
    });

    it('rejects with ExtensionUnavailable if no response is received within timeout', async () => {
      const mockEventListener = vi.fn();

      window.addEventListener = mockEventListener as any;

      const promise = getChunk('testuser', 0);

      // Catch the rejection to prevent unhandled promise rejection
      promise.catch(() => {
        // Expected rejection, ignore
      });

      // Run all pending timers to trigger all retry attempts
      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(ExtensionUnavailable);

      expect(window.postMessage).toHaveBeenCalledWith(
        {
          type: 'request_chunk_by_index',
          username: 'testuser',
          index: 0,
          source: 'leettracker-webapp',
        },
        '*',
      );
    }, 10000); // Increase timeout for this test with fake timers
  });

  describe('checkExtensionInstalled', () => {
    it('returns true when extension responds', async () => {
      const mockResponse = {
        source: 'leettracker-extension',
        type: 'response_chunk_manifest',
        username: 'test',
        chunks: [],
        total: 0,
        totalSynced: 0,
      };

      const mockEventListener = vi.fn((eventType, handler) => {
        if (eventType === 'message') {
          setTimeout(() => handler({ data: mockResponse }), 10);
        }
      });

      window.addEventListener = mockEventListener as any;

      const { checkExtensionInstalled } = await import('./extensionBridge');
      const promise = checkExtensionInstalled();
      await vi.advanceTimersByTimeAsync(50);
      const result = await promise;

      expect(result).toBe(true);
    });

    it('returns false when extension unavailable (timeout)', async () => {
      const mockEventListener = vi.fn();
      window.addEventListener = mockEventListener as any;

      const { checkExtensionInstalled } = await import('./extensionBridge');
      const promise = checkExtensionInstalled();

      // Catch the rejection to prevent unhandled promise rejection
      promise.catch(() => {
        // Expected behavior
      });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe(false);
    });
  });
});
