import { db } from '@/storage/db';
import { resetUser } from './analytics';

/**
 * Centralized sign-out logic used across the application.
 * Handles:
 * - Clearing username from storage
 * - Resetting analytics user tracking
 * - Reloading the page to ensure clean state
 *
 * @param options.skipConfirm - If true, skips the confirmation dialog (default: true for onboarding screens)
 * @param options.errorCallback - Optional callback to handle errors (e.g., show custom error message)
 */
export async function signOut(options?: {
  skipConfirm?: boolean;
  errorCallback?: (_error: Error) => void;
}): Promise<void> {
  const { skipConfirm = true, errorCallback } = options || {};

  // Show confirmation dialog if requested
  if (!skipConfirm && !window.confirm('Are you sure you want to sign out?')) {
    return;
  }

  try {
    // Clear username from storage
    await db.clearUsername();

    // Reset analytics tracking
    await resetUser();
  } catch (err) {
    console.error('[auth] Failed to sign out:', err);

    if (errorCallback) {
      errorCallback(err as Error);
    } else {
      alert('An error occurred while signing out. Please try again.');
    }

    // Don't reload if there was an error
    return;
  }

  // Reload to ensure clean state
  window.location.reload();
}
