/**
 * Browser detection utilities for onboarding flow.
 * Used to determine if user is on a Chromium-based browser.
 */

/**
 * Check if the current browser is running on a mobile device
 */
export function isMobileBrowser(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();

  // Check for common mobile indicators
  const mobileKeywords = [
    'mobile',
    'android',
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'windows phone',
    'webos',
  ];

  return mobileKeywords.some((keyword) => userAgent.includes(keyword));
}

/**
 * Check if the current browser is Chromium-based (Chrome, Edge, Brave, Opera, etc.)
 * This is required for the Chrome extension to work.
 */
export function isChromiumBrowser(): boolean {
  const userAgent = navigator.userAgent;

  // Firefox check - definitely not Chromium
  if (userAgent.includes('Firefox/')) {
    return false;
  }

  // Safari check - if it has "Safari" but NOT "Chrome", it's real Safari (not Chromium)
  // Real Safari has: "Version/X.X Safari/605.1.15" but NO "Chrome/"
  // Chrome has: "Chrome/139.0.0.0 Safari/537.36"
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) {
    return false;
  }

  // Now check for Chromium-based browsers
  // All Chromium browsers include "Chrome/" in their user agent
  const hasChrome = userAgent.includes('Chrome/');

  // Additional check: Chromium browsers have the chrome object
  const hasChromeAPI = typeof window !== 'undefined' && 'chrome' in window;

  // Must have both Chrome in UA and the chrome API
  return hasChrome && hasChromeAPI;
}
