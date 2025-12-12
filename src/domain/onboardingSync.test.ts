import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkForValidManifest, monitorSyncProgress, ManifestResponse } from './onboardingSync';
import * as extensionBridge from '@/api/extensionBridge';
import * as extensionSync from './extensionSync';

vi.mock('@/api/extensionBridge');
vi.mock('./extensionSync');

describe('onboardingSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('checkForValidManifest', () => {
    it('returns true when manifest has chunks', async () => {
      const mockManifest: ManifestResponse = {
        chunks: [{ index: 0, from: 0, to: 100 }],
        total: undefined,
        totalSynced: undefined,
      };

      vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);

      const result = await checkForValidManifest('testuser');

      expect(result.hasManifest).toBe(true);
      expect(result.total).toBe(null);
      expect(extensionBridge.getManifestSince).toHaveBeenCalledWith('testuser', 0);
    });

    it('returns true when manifest has total > 0', async () => {
      const mockManifest: ManifestResponse = {
        chunks: [],
        total: 50,
        totalSynced: 25,
      };

      vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);

      const result = await checkForValidManifest('testuser');

      expect(result.hasManifest).toBe(true);
      expect(result.total).toBe(50);
    });

    it('returns true when manifest has total = 0', async () => {
      const mockManifest: ManifestResponse = {
        chunks: [],
        total: 0,
        totalSynced: 0,
      };

      vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);

      const result = await checkForValidManifest('testuser');

      expect(result.hasManifest).toBe(true);
      expect(result.total).toBe(0);
    });

    it('returns false when manifest is empty (no chunks, no total)', async () => {
      const mockManifest: ManifestResponse = {
        chunks: [],
        total: undefined,
        totalSynced: undefined,
      };

      vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);

      const result = await checkForValidManifest('testuser');

      expect(result.hasManifest).toBe(false);
      expect(result.total).toBe(null);
    });

    it('returns false when extension is unavailable', async () => {
      const error = new Error('Extension timeout');
      (error as any).code = 'EXTENSION_UNAVAILABLE';

      vi.mocked(extensionBridge.getManifestSince).mockRejectedValue(error);

      const result = await checkForValidManifest('testuser');

      expect(result.hasManifest).toBe(false);
      expect(result.total).toBe(null);
    });

    it('returns false and logs error on network errors', async () => {
      const error = new Error('Network error');

      vi.mocked(extensionBridge.getManifestSince).mockRejectedValue(error);

      const result = await checkForValidManifest('testuser');

      expect(result.hasManifest).toBe(false);
      expect(result.total).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        '[OnboardingSync] Error checking manifest:',
        error,
      );
    });
  });

  describe('monitorSyncProgress', () => {
    describe('Legacy extension (undefined values)', () => {
      it('returns syncing status when no chunks exist', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: undefined,
          totalSynced: undefined,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(0);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(0);
        expect(result.total).toBe(null);
        expect(extensionSync.syncFromExtension).toHaveBeenCalledWith('testuser');
      });

      it('completes when legacy extension has chunks', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [
            { index: 0, from: 0, to: 100 },
            { index: 1, from: 100, to: 200 },
          ],
          total: undefined,
          totalSynced: undefined,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(5);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('complete');
        expect(result.progress).toBe(100);
        expect(result.total).toBe(null);
      });

      it('calls syncFromExtension in background for legacy extension', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [{ index: 0, from: 0, to: 100 }],
          total: undefined,
          totalSynced: undefined,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(3);

        await monitorSyncProgress('testuser');

        expect(extensionSync.syncFromExtension).toHaveBeenCalledWith('testuser');
      });

      it('handles sync errors gracefully for legacy extension', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: undefined,
          totalSynced: undefined,
        };

        const syncError = new Error('Sync failed');
        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockRejectedValue(syncError);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(0);
        expect(result.error).toBe('Failed to sync from extension');
      });
    });

    describe('New extension not started (null values)', () => {
      it('returns syncing status when total is null', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: null,
          totalSynced: null,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(0);
        expect(result.total).toBe(null);
      });

      it('returns syncing status when totalSynced is null', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: null,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(0);
        expect(result.total).toBe(null);
      });
    });

    describe('Active sync (number values)', () => {
      it('calculates progress correctly at 0%', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 0,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(0);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(0);
        expect(result.total).toBe(100);
      });

      it('calculates progress correctly at 50%', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 50,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(0);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(50);
        expect(result.total).toBe(100);
      });

      it('calculates progress correctly at 99%', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 99,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(0);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(99);
        expect(result.total).toBe(100);
      });

      it('detects completion when totalSynced >= total', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 100,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(0);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('complete');
        expect(result.progress).toBe(100);
        expect(result.total).toBe(100);
      });

      it('detects completion when totalSynced > total', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 105,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(0);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('complete');
        expect(result.progress).toBe(100);
        expect(result.total).toBe(100);
      });

      it('handles total = 0 without division by zero', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 0,
          totalSynced: 0,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(0);

        const result = await monitorSyncProgress('testuser');

        // When total is 0, we treat it as complete
        expect(result.status).toBe('complete');
        expect(result.progress).toBe(100);
        expect(result.total).toBe(0);
      });

      it('calls syncFromExtension in background during active sync', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 50,
        };

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockResolvedValue(10);

        await monitorSyncProgress('testuser');

        expect(extensionSync.syncFromExtension).toHaveBeenCalledWith('testuser');
      });

      it('handles sync errors during active sync', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 50,
        };

        const syncError = new Error('Network error');
        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockRejectedValue(syncError);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(0);
        expect(result.total).toBe(100);
        expect(result.error).toBe('Failed to sync from extension');
      });

      it('ignores EXTENSION_UNAVAILABLE errors during sync', async () => {
        const mockManifest: ManifestResponse = {
          chunks: [],
          total: 100,
          totalSynced: 75,
        };

        const syncError = new Error('Extension unavailable');
        (syncError as any).code = 'EXTENSION_UNAVAILABLE';

        vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);
        vi.mocked(extensionSync.syncFromExtension).mockRejectedValue(syncError);

        const result = await monitorSyncProgress('testuser');

        expect(result.status).toBe('syncing');
        expect(result.progress).toBe(75);
        expect(result.error).toBeUndefined();
      });
    });

    it('handles manifest fetch errors', async () => {
      const error = new Error('Network error');
      vi.mocked(extensionBridge.getManifestSince).mockRejectedValue(error);

      const result = await monitorSyncProgress('testuser');

      expect(result.status).toBe('syncing');
      expect(result.progress).toBe(0);
      expect(result.total).toBe(null);
      expect(result.error).toBe('Failed to monitor sync progress');
    });

    it('handles unexpected total/totalSynced types', async () => {
      const mockManifest = {
        chunks: [],
        total: 'invalid' as any,
        totalSynced: 50,
      };

      vi.mocked(extensionBridge.getManifestSince).mockResolvedValue(mockManifest as any);

      const result = await monitorSyncProgress('testuser');

      expect(result.status).toBe('syncing');
      expect(result.progress).toBe(0);
      expect(result.total).toBe(null);
    });
  });
});
