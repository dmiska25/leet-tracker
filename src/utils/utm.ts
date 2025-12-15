/**
 * UTM Parameter Tracking & First-Touch Attribution
 *
 * This module handles capturing and persisting UTM parameters and referrer information
 * for proper attribution tracking in PostHog analytics.
 *
 * Usage:
 * - Call `captureInitialAttribution()` on app load (already integrated in analytics.ts)
 * - UTM params are automatically persisted to localStorage
 * - They're attached to PostHog identify calls for long-term attribution
 */

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  initial_referrer?: string;
  initial_landing_page?: string;
  attribution_timestamp?: number;
}

const STORAGE_KEY = 'leet_tracker_attribution';

/**
 * Parse UTM parameters from the current URL
 */
export function getUTMParams(): Partial<AttributionData> {
  const params = new URLSearchParams(window.location.search);

  const attribution: Partial<AttributionData> = {};

  if (params.has('utm_source')) attribution.utm_source = params.get('utm_source') || undefined;
  if (params.has('utm_medium')) attribution.utm_medium = params.get('utm_medium') || undefined;
  if (params.has('utm_campaign'))
    attribution.utm_campaign = params.get('utm_campaign') || undefined;
  if (params.has('utm_content')) attribution.utm_content = params.get('utm_content') || undefined;
  if (params.has('utm_term')) attribution.utm_term = params.get('utm_term') || undefined;

  return attribution;
}

/**
 * Get referrer information (where the user came from)
 */
export function getReferrerData(): Partial<AttributionData> {
  const referrer = document.referrer;

  if (!referrer) return {};

  try {
    const referrerUrl = new URL(referrer);
    const currentHost = window.location.hostname;

    // Only capture external referrers (not same-site navigation)
    if (referrerUrl.hostname !== currentHost) {
      return { initial_referrer: referrer };
    }
  } catch {
    // Invalid referrer URL, ignore
  }

  return {};
}

/**
 * Capture and persist attribution data on first visit
 * Returns the attribution data (either newly captured or existing)
 */
export function captureInitialAttribution(): AttributionData | null {
  // Check if we already have attribution data
  const existing = getStoredAttribution();
  if (existing) {
    return existing;
  }

  // Capture new attribution
  const utmParams = getUTMParams();
  const referrerData = getReferrerData();

  // Only persist if we have at least one piece of attribution data
  const hasAttribution = Object.keys(utmParams).length > 0 || Object.keys(referrerData).length > 0;

  if (!hasAttribution) {
    return null;
  }

  const attribution: AttributionData = {
    ...utmParams,
    ...referrerData,
    initial_landing_page: window.location.pathname + window.location.search,
    attribution_timestamp: Date.now(),
  };

  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch (err) {
    console.warn('[utm] Failed to persist attribution data', err);
  }

  return attribution;
}

/**
 * Get stored attribution data from localStorage
 */
export function getStoredAttribution(): AttributionData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as AttributionData;
  } catch (err) {
    console.warn('[utm] Failed to read attribution data', err);
    return null;
  }
}

/**
 * Clear stored attribution (useful for testing or user privacy controls)
 */
export function clearAttribution(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[utm] Failed to clear attribution data', err);
  }
}

/**
 * Get current session UTM parameters (for session-level tracking)
 * These are NOT persisted and reflect the current page load only
 */
export function getSessionUTMs(): Partial<AttributionData> {
  return getUTMParams();
}
