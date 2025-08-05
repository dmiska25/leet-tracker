import posthog from 'posthog-js';

const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME;

/**
 * SHA-256 helper to hash the LeetCode username before sending to PostHog.
 * Returns a lowercase hex string.
 */
export async function sha256(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let identified = false;

/**
 * Identify the current user (once per page load) and emit the `app_opened` event.
 */
export async function identifyUser(
  username: string,
  props: { extensionInstalled: boolean; profileId: string; lastSync: number },
) {
  if (!username || identified || username == DEMO_USERNAME) return;
  try {
    const distinctId = await sha256(username);
    posthog.identify(distinctId, { username: username });
    posthog.people.set(props);
    identified = true;
    posthog.capture('app_opened', props);
  } catch (err) {
    // Analytics failure shouldn't break the app
    console.warn('[analytics] identify failed', err);
  }
}

export async function resetUser() {
  if (!identified) return;
  try {
    posthog.reset();
    identified = false;
  } catch (err) {
    // Analytics failure shouldn't break the app
    console.warn('[analytics] reset failed', err);
  }
}

/* ---------- helper wrappers ---------- */

export const trackUserSignedIn = (hasDemoAccount: boolean) =>
  posthog.capture('user_signed_in', { hasDemoAccount });

export const trackSyncCompleted = (
  numNewSolves: number,
  durationMs: number,
  usedExtension: boolean,
) => posthog.capture('sync_completed', { numNewSolves, durationMs, usedExtension });

export const trackSolveSaved = (slug: string, status: string | undefined, withFeedback: boolean) =>
  posthog.capture('solve_saved', { slug, status, withFeedback });

export const trackPromptCopied = (slug: string) => posthog.capture('prompt_copied', { slug });

export const trackFeedbackImported = (slug: string, finalScore: number) =>
  posthog.capture('feedback_imported', { slug, finalScore });

export const trackRecommendationClicked = (slug: string, bucket: string, tag: string) =>
  posthog.capture('recommendation_clicked', { slug, bucket, tag });

export const trackProfileChanged = (newProfileId: string) =>
  posthog.capture('profile_changed', { newProfileId });

export const trackExtensionDetected = () => posthog.capture('extension_detected');

export const trackErrorBoundary = (errorMessage: string, stack?: string) =>
  posthog.capture('error_boundary_triggered', { errorMessage, stack });
