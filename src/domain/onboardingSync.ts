import { getManifestSince } from '@/api/extensionBridge';
import { syncFromExtension } from './extensionSync';

/**
 * Manifest response structure from the extension
 */
export interface ManifestResponse {
  chunks: Array<{ index: number; from: number; to: number }>;
  total?: number | null;
  totalSynced?: number | null;
}

/**
 * Sync status result returned by monitoring functions
 */
export interface SyncStatusResult {
  status: 'waiting' | 'syncing' | 'complete';
  progress: number;
  total: number | null;
  error?: string;
}

/**
 * Check if a user has a valid manifest (they've visited LeetCode while logged in)
 */
export async function checkForValidManifest(username: string): Promise<{
  hasManifest: boolean;
  total: number | null;
}> {
  try {
    const manifest = (await getManifestSince(username, 0)) as ManifestResponse;

    // Check if manifest is valid and has chunks or total
    if (manifest && (manifest.chunks.length > 0 || typeof manifest.total === 'number')) {
      const total = manifest.total !== undefined ? manifest.total : null;
      console.log(`[OnboardingSync] Valid manifest detected, total: ${total}`);
      return { hasManifest: true, total };
    }

    console.log('[OnboardingSync] Manifest response received but no data yet');
    return { hasManifest: false, total: null };
  } catch (err: any) {
    if (err?.code !== 'EXTENSION_UNAVAILABLE') {
      console.error('[OnboardingSync] Error checking manifest:', err);
    }
    return { hasManifest: false, total: null };
  }
}

/**
 * Monitor sync progress and handle different extension states:
 * - Legacy (undefined): Wait for chunks, complete when chunks appear
 * - New extension not started (null): Wait for sync to begin
 * - Active sync (numbers): Calculate and return progress
 */
export async function monitorSyncProgress(username: string): Promise<SyncStatusResult> {
  try {
    const manifest = (await getManifestSince(username, 0)) as ManifestResponse;
    const total = manifest.total;
    const totalSynced = manifest.totalSynced;

    // Case 1: Legacy extension (undefined) - wait for chunks, then complete
    if (total === undefined && totalSynced === undefined) {
      console.log('[OnboardingSync] Legacy extension detected, waiting for chunks');

      // Sync from extension (this updates IndexedDB in the background)
      try {
        const addedCount = await syncFromExtension(username);
        if (addedCount > 0) {
          console.log(`[OnboardingSync] Synced ${addedCount} new solves from extension`);
        }
      } catch (err: any) {
        if (err?.code !== 'EXTENSION_UNAVAILABLE') {
          console.error('[OnboardingSync] Error syncing from extension:', err);
          return {
            status: 'syncing',
            progress: 0,
            total: null,
            error: 'Failed to sync from extension',
          };
        }
      }

      // If we have any chunks, complete onboarding
      if (manifest.chunks && manifest.chunks.length > 0) {
        console.log('[OnboardingSync] Legacy extension has chunks, completing onboarding');
        return {
          status: 'complete',
          progress: 100,
          total: null,
        };
      }

      console.log('[OnboardingSync] Legacy extension waiting for first chunk');
      return {
        status: 'syncing',
        progress: 0,
        total: null,
      };
    }

    // Case 2: New extension, sync not started yet (null) - wait at regular screen
    if (total === null || totalSynced === null) {
      console.log('[OnboardingSync] Extension ready but sync not started (null values)');
      return {
        status: 'syncing',
        progress: 0,
        total: null,
      };
    }

    // Case 3: New extension, sync in progress or complete (number values)
    if (typeof total !== 'number' || typeof totalSynced !== 'number') {
      console.log('[OnboardingSync] Unexpected: total or totalSynced not a number');
      return {
        status: 'syncing',
        progress: 0,
        total: null,
      };
    }

    console.log(`[OnboardingSync] Sync progress: ${totalSynced}/${total}`);

    // Sync from extension (this updates IndexedDB in the background)
    try {
      const addedCount = await syncFromExtension(username);
      if (addedCount > 0) {
        console.log(`[OnboardingSync] Synced ${addedCount} new solves from extension`);
      }
    } catch (err: any) {
      if (err?.code !== 'EXTENSION_UNAVAILABLE') {
        console.error('[OnboardingSync] Error syncing from extension:', err);
        return {
          status: 'syncing',
          progress: 0,
          total,
          error: 'Failed to sync from extension',
        };
      }
    }

    // Calculate progress
    const progress = total > 0 ? Math.min(100, Math.round((totalSynced / total) * 100)) : 100;
    console.log(`[OnboardingSync] Progress: ${totalSynced}/${total} (${progress}%)`);

    // Check if complete (including when total is 0)
    if (totalSynced >= total) {
      console.log('[OnboardingSync] Sync complete!');
      return {
        status: 'complete',
        progress: 100,
        total,
      };
    }

    return {
      status: 'syncing',
      progress,
      total,
    };
  } catch (err) {
    console.error('[OnboardingSync] Error monitoring progress:', err);
    return {
      status: 'syncing',
      progress: 0,
      total: null,
      error: 'Failed to monitor sync progress',
    };
  }
}
