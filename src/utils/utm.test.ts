/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUTMParams,
  getReferrerData,
  captureInitialAttribution,
  getStoredAttribution,
  clearAttribution,
  getSessionUTMs,
} from './utm';

describe('UTM Tracking', () => {
  const originalLocation = window.location;
  const originalReferrer = document.referrer;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Mock window.location
    delete (window as any).location;
    window.location = { ...originalLocation } as Location;
  });

  afterEach(() => {
    window.location = originalLocation;
    Object.defineProperty(document, 'referrer', {
      value: originalReferrer,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('getUTMParams', () => {
    it('should parse all UTM parameters from URL', () => {
      window.location.search =
        '?utm_source=reddit&utm_medium=comment&utm_campaign=leettracker&utm_content=discussion-thread&utm_term=leetcode';

      const params = getUTMParams();

      expect(params).toEqual({
        utm_source: 'reddit',
        utm_medium: 'comment',
        utm_campaign: 'leettracker',
        utm_content: 'discussion-thread',
        utm_term: 'leetcode',
      });
    });

    it('should return empty object when no UTM parameters present', () => {
      window.location.search = '';
      const params = getUTMParams();
      expect(params).toEqual({});
    });

    it('should handle partial UTM parameters', () => {
      window.location.search = '?utm_source=linkedin&utm_medium=bio';
      const params = getUTMParams();

      expect(params).toEqual({
        utm_source: 'linkedin',
        utm_medium: 'bio',
      });
    });

    it('should handle URL with non-UTM parameters', () => {
      window.location.search = '?page=2&utm_source=twitter&sort=date';
      const params = getUTMParams();

      expect(params).toEqual({
        utm_source: 'twitter',
      });
    });
  });

  describe('getReferrerData', () => {
    it('should capture external referrer', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://reddit.com/r/leetcode',
        configurable: true,
      });
      window.location.hostname = 'leettracker.com';

      const referrer = getReferrerData();

      expect(referrer).toEqual({
        initial_referrer: 'https://reddit.com/r/leetcode',
      });
    });

    it('should ignore same-site referrer', () => {
      window.location.hostname = 'leettracker.com';
      Object.defineProperty(document, 'referrer', {
        value: 'https://leettracker.com/dashboard',
        configurable: true,
      });

      const referrer = getReferrerData();

      expect(referrer).toEqual({});
    });

    it('should return empty object when no referrer', () => {
      Object.defineProperty(document, 'referrer', {
        value: '',
        configurable: true,
      });

      const referrer = getReferrerData();

      expect(referrer).toEqual({});
    });

    it('should handle invalid referrer URL gracefully', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'not-a-valid-url',
        configurable: true,
      });

      const referrer = getReferrerData();

      expect(referrer).toEqual({});
    });
  });

  describe('captureInitialAttribution', () => {
    it('should capture and persist UTM parameters on first visit', () => {
      window.location.search = '?utm_source=reddit&utm_campaign=launch';
      window.location.pathname = '/dashboard';

      const attribution = captureInitialAttribution();

      expect(attribution).toMatchObject({
        utm_source: 'reddit',
        utm_campaign: 'launch',
        initial_landing_page: '/dashboard?utm_source=reddit&utm_campaign=launch',
      });
      expect(attribution?.attribution_timestamp).toBeDefined();

      // Verify persistence
      const stored = getStoredAttribution();
      expect(stored).toEqual(attribution);
    });

    it('should return existing attribution on subsequent calls', () => {
      // First visit with UTMs
      window.location.search = '?utm_source=reddit';
      const first = captureInitialAttribution();

      // Second visit with different UTMs
      window.location.search = '?utm_source=twitter';
      const second = captureInitialAttribution();

      // Should return the first attribution, not create new one
      expect(second).toEqual(first);
      expect(second?.utm_source).toBe('reddit');
    });

    it('should return null when no attribution data available', () => {
      window.location.search = '';
      Object.defineProperty(document, 'referrer', {
        value: '',
        configurable: true,
      });

      const attribution = captureInitialAttribution();

      expect(attribution).toBeNull();
      expect(getStoredAttribution()).toBeNull();
    });

    it('should capture referrer along with UTM params', () => {
      window.location.search = '?utm_source=reddit';
      window.location.pathname = '/';
      window.location.hostname = 'leettracker.com';
      Object.defineProperty(document, 'referrer', {
        value: 'https://google.com/search',
        configurable: true,
      });

      const attribution = captureInitialAttribution();

      expect(attribution).toMatchObject({
        utm_source: 'reddit',
        initial_referrer: 'https://google.com/search',
      });
    });

    it('should handle localStorage errors gracefully', () => {
      window.location.search = '?utm_source=reddit';

      // Mock localStorage methods before and after the operation
      const originalSetItem = localStorage.setItem;
      const originalGetItem = localStorage.getItem;

      localStorage.getItem = vi.fn().mockReturnValue(null);
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const attribution = captureInitialAttribution();

      // Should still return attribution even if storage fails
      expect(attribution).toMatchObject({ utm_source: 'reddit' });
      // Should warn about storage failure
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[utm] Failed to persist attribution data',
        expect.any(Error),
      );

      localStorage.setItem = originalSetItem;
      localStorage.getItem = originalGetItem;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getStoredAttribution', () => {
    it('should retrieve stored attribution data', () => {
      const mockAttribution = {
        utm_source: 'reddit',
        utm_medium: 'comment',
        attribution_timestamp: Date.now(),
      };

      localStorage.setItem('leet_tracker_attribution', JSON.stringify(mockAttribution));

      const stored = getStoredAttribution();

      expect(stored).toEqual(mockAttribution);
    });

    it('should return null when no data stored', () => {
      const stored = getStoredAttribution();
      expect(stored).toBeNull();
    });

    it('should handle corrupted data gracefully', () => {
      localStorage.setItem('leet_tracker_attribution', 'invalid-json{');
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const stored = getStoredAttribution();

      expect(stored).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('clearAttribution', () => {
    it('should clear stored attribution data', () => {
      window.location.search = '?utm_source=reddit';
      captureInitialAttribution();

      expect(getStoredAttribution()).not.toBeNull();

      clearAttribution();

      expect(getStoredAttribution()).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      clearAttribution();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[utm] Failed to clear attribution data',
        expect.any(Error),
      );

      localStorage.removeItem = originalRemoveItem;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('getSessionUTMs', () => {
    it('should return current URL UTM parameters without persistence', () => {
      window.location.search = '?utm_source=twitter&utm_campaign=new';

      const session = getSessionUTMs();

      expect(session).toEqual({
        utm_source: 'twitter',
        utm_campaign: 'new',
      });

      // Should not persist to localStorage
      expect(getStoredAttribution()).toBeNull();
    });

    it('should work independently of stored attribution', () => {
      // Store first-touch attribution
      window.location.search = '?utm_source=reddit';
      captureInitialAttribution();

      // Change URL to simulate new session with different UTMs
      window.location.search = '?utm_source=twitter';

      const session = getSessionUTMs();
      const stored = getStoredAttribution();

      expect(session.utm_source).toBe('twitter');
      expect(stored?.utm_source).toBe('reddit');
    });
  });

  describe('Integration: First-touch vs Session tracking', () => {
    it('should maintain first-touch attribution while tracking session UTMs', () => {
      // Simulate first visit from Reddit
      window.location.search = '?utm_source=reddit&utm_campaign=launch';
      const firstTouch = captureInitialAttribution();

      expect(firstTouch?.utm_source).toBe('reddit');

      // Simulate return visit from Twitter (different UTMs)
      window.location.search = '?utm_source=twitter&utm_campaign=promo';
      const sessionUTMs = getSessionUTMs();
      const storedAttribution = getStoredAttribution();

      // Session UTMs should reflect current visit
      expect(sessionUTMs.utm_source).toBe('twitter');
      expect(sessionUTMs.utm_campaign).toBe('promo');

      // First-touch attribution should remain unchanged
      expect(storedAttribution?.utm_source).toBe('reddit');
      expect(storedAttribution?.utm_campaign).toBe('launch');
    });
  });
});
