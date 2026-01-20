/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { identifyUser, initializeAttribution, sha256, __resetAnalyticsState } from './analytics';
import * as utm from './utm';

// Mock posthog
vi.mock('posthog-js', () => ({
  default: {
    identify: vi.fn(),
    capture: vi.fn(),
    people: {
      set: vi.fn(),
    },
  },
}));

import posthog from 'posthog-js';

describe('Analytics with UTM Attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetAnalyticsState(); // Reset analytics session state
    // Reset window.location
    delete (window as any).location;
    (window as any).location = { search: '', pathname: '/', hostname: 'localhost' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeAttribution', () => {
    it('should capture UTM parameters on first call', () => {
      window.location.search = '?utm_source=reddit&utm_campaign=launch';
      const captureInitialAttributionSpy = vi.spyOn(utm, 'captureInitialAttribution');

      initializeAttribution();

      expect(captureInitialAttributionSpy).toHaveBeenCalledTimes(1);
    });

    it('should only capture attribution once per session', () => {
      const captureInitialAttributionSpy = vi.spyOn(utm, 'captureInitialAttribution');

      initializeAttribution();
      initializeAttribution();
      initializeAttribution();

      expect(captureInitialAttributionSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', () => {
      const captureInitialAttributionSpy = vi
        .spyOn(utm, 'captureInitialAttribution')
        .mockImplementation(() => {
          throw new Error('Storage error');
        });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      initializeAttribution();

      expect(consoleWarnSpy).toHaveBeenCalled();

      captureInitialAttributionSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('identifyUser with attribution', () => {
    it('should include first-touch attribution when identifying user', async () => {
      // Setup: capture initial attribution
      window.location.search = '?utm_source=reddit&utm_medium=comment&utm_campaign=launch';
      window.location.pathname = '/dashboard';
      Object.defineProperty(document, 'referrer', {
        value: 'https://google.com/search',
        configurable: true,
      });

      utm.captureInitialAttribution();

      // Act: identify user
      const username = 'testuser';
      const lastSync = Date.now();
      await identifyUser(username, { lastSync });

      // Assert: PostHog identify should include attribution
      const distinctId = await sha256(username);
      expect(posthog.identify).toHaveBeenCalledWith(
        distinctId,
        expect.objectContaining({
          username,
          initial_utm_source: 'reddit',
          initial_utm_medium: 'comment',
          initial_utm_campaign: 'launch',
          initial_referrer: 'https://google.com/search',
        }),
      );

      // Assert: app_opened event should include attribution
      expect(posthog.capture).toHaveBeenCalledWith(
        'app_opened',
        expect.objectContaining({
          lastSync,
          utm_source: 'reddit',
          utm_medium: 'comment',
          utm_campaign: 'launch',
        }),
      );
    });

    it('should work without attribution data', async () => {
      const username = 'testuser';
      const lastSync = Date.now();
      await identifyUser(username, { lastSync });

      const distinctId = await sha256(username);
      expect(posthog.identify).toHaveBeenCalledWith(distinctId, { username });
      expect(posthog.capture).toHaveBeenCalledWith('app_opened', { lastSync });
    });

    it('should not identify demo user', async () => {
      const demoUsername = import.meta.env.VITE_DEMO_USERNAME;
      await identifyUser(demoUsername, { lastSync: Date.now() });

      expect(posthog.identify).not.toHaveBeenCalled();
    });

    it('should only identify once per session', async () => {
      const username = 'testuser';
      const lastSync = Date.now();

      await identifyUser(username, { lastSync });
      await identifyUser(username, { lastSync });
      await identifyUser(username, { lastSync });

      expect(posthog.identify).toHaveBeenCalledTimes(1);
    });

    it('should include partial attribution data when available', async () => {
      // Setup: only UTM source, no other params
      window.location.search = '?utm_source=twitter';
      utm.captureInitialAttribution();

      const username = 'testuser';
      await identifyUser(username, { lastSync: Date.now() });

      const distinctId = await sha256(username);
      expect(posthog.identify).toHaveBeenCalledWith(
        distinctId,
        expect.objectContaining({
          username,
          initial_utm_source: 'twitter',
        }),
      );

      // Should not include undefined utm fields
      const identifyCall = (posthog.identify as any).mock.calls[0][1];
      expect(identifyCall.initial_utm_medium).toBeUndefined();
      expect(identifyCall.initial_utm_campaign).toBeUndefined();
    });

    it('should handle analytics errors gracefully', async () => {
      vi.mocked(posthog.identify).mockImplementation(() => {
        throw new Error('PostHog error');
      });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const username = 'testuser';
      await identifyUser(username, { lastSync: Date.now() });

      expect(consoleWarnSpy).toHaveBeenCalledWith('[analytics] identify failed', expect.any(Error));

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Integration: Complete flow', () => {
    it('should capture attribution on app load, then attach to user on identify', async () => {
      // Step 1: App loads with UTM parameters
      window.location.search = '?utm_source=linkedin&utm_medium=bio&utm_campaign=job-search';
      initializeAttribution();

      // Verify attribution was captured
      const attribution = utm.getStoredAttribution();
      expect(attribution?.utm_source).toBe('linkedin');

      // Step 2: User signs in
      const username = 'testuser';
      await identifyUser(username, { lastSync: Date.now() });

      // Step 3: Verify attribution was attached to user
      const distinctId = await sha256(username);
      expect(posthog.identify).toHaveBeenCalledWith(
        distinctId,
        expect.objectContaining({
          initial_utm_source: 'linkedin',
          initial_utm_medium: 'bio',
          initial_utm_campaign: 'job-search',
        }),
      );
    });

    it('should maintain first-touch attribution across multiple sessions', async () => {
      // First session: User arrives from Reddit
      window.location.search = '?utm_source=reddit&utm_campaign=launch';
      initializeAttribution();
      await identifyUser('testuser', { lastSync: Date.now() });

      // Simulate page reload (clear in-memory state)
      vi.clearAllMocks();

      // Second session: User returns directly (no UTMs)
      window.location.search = '';
      const attribution = utm.getStoredAttribution();

      // Attribution should still be from first touch
      expect(attribution?.utm_source).toBe('reddit');
      expect(attribution?.utm_campaign).toBe('launch');
    });
  });
});
