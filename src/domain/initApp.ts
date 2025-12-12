import { db } from '../storage/db';
import { identifyUser } from '@/utils/analytics';
import { syncSolveData } from './syncSolveData';
import { syncProblemCatalog } from './syncProblemCatalog';

/**
 * Initialize the app on startup.
 *
 * Responsibilities:
 * - Start async catalog sync in background (non-blocking)
 * - Sync solve data from extension/demo (BLOCKING)
 * - Identify user for analytics
 *
 * Does NOT compute progress - that's the Dashboard's responsibility.
 * Does NOT manage catalog logic - that's in syncProblemCatalog.
 *
 * @returns Username and any errors encountered
 * @throws Error if extension unavailable for non-demo users
 */
export async function initApp(): Promise<{
  username: string | undefined;
  errors: string[];
}> {
  const errors: string[] = [];
  const username = await db.getUsername();

  if (!username) {
    console.log('[initApp] No username — app not initialized');
    return { username: undefined, errors: [] };
  }

  console.log(`[initApp] Username found: ${username}`);

  // Start catalog sync in background (non-blocking, async)
  syncProblemCatalog().catch((err) => {
    console.error('[initApp] Background catalog sync failed:', err);
  });

  // BLOCKING: Get latest solve data from extension/demo
  try {
    const addedCount = await syncSolveData(username);
    if (addedCount > 0) {
      console.log(`[initApp] Synced ${addedCount} new solves`);
    }
  } catch (err: any) {
    if (err?.code === 'EXTENSION_UNAVAILABLE') {
      throw new Error('Extension not available');
    }
    console.warn('[initApp] Failed to sync solve data', err);
    errors.push('An unexpected error occurred while loading solve data.');
  }

  // Identify user for analytics (no profileId needed)
  await identifyUser(username, {
    lastSync: Date.now(),
  });

  return { username, errors };
}
