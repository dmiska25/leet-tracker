import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getManifestSince, getChunk, ExtensionUnavailable } from './extensionBridge';

describe('extensionBridge', () => {
  let originalPostMessage: typeof window.postMessage;

  beforeEach(() => {
    originalPostMessage = window.postMessage;
    window.postMessage = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

      const manifest = await getManifestSince('testuser', 0);

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

      await expect(getManifestSince('testuser', 0)).rejects.toThrow(ExtensionUnavailable);

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

      const chunk = await getChunk('testuser', 0);

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

      await expect(getChunk('testuser', 0)).rejects.toThrow(ExtensionUnavailable);

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
  });
});
