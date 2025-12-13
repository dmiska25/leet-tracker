import { db } from '@/storage/db';
import { syncFromExtension } from './extensionSync';
import { syncDemoSolves } from '@/api/demo';

/**
 * Centralized solve data synchronization.
 * This is the ONLY place solve data should be fetched in normal app operation.
 *
 * Called by:
 * - initApp() on app startup (BLOCKING)
 * - extensionPoller for background updates
 * - onboardingSync during onboarding flow
 *
 * @param username - The current user's username
 * @returns Number of new solves added
 * @throws Error if extension unavailable (non-demo users)
 */
export async function syncSolveData(username: string): Promise<number> {
  const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME;

  if (username === DEMO_USERNAME) {
    console.log('[syncSolveData] Syncing demo user data');
    return await syncDemoSolves(db);
  } else {
    console.log('[syncSolveData] Syncing from extension');
    return await syncFromExtension(username);
  }
}
