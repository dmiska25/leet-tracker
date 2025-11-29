import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isChromiumBrowser, isMobileBrowser } from './browserDetection';

describe('browserDetection', () => {
  let originalUserAgent: string;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    originalWindow = window;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true,
      writable: true,
    });
    global.window = originalWindow;
  });

  describe('isMobileBrowser', () => {
    it('returns true for Android Chrome', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(true);
    });

    it('returns true for iPhone Safari', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(true);
    });

    it('returns true for iPad', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(true);
    });

    it('returns true for Samsung Internet', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(true);
    });

    it('returns false for desktop Chrome on macOS', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(false);
    });

    it('returns false for desktop Chrome on Windows', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(false);
    });

    it('returns false for desktop Firefox', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(false);
    });

    it('returns false for desktop Safari on macOS', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(false);
    });

    it('handles case-insensitive mobile detection', () => {
      // Test with unusual casing variations
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Linux; ANDROID 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 MOBILE Safari/537.36',
        configurable: true,
      });

      expect(isMobileBrowser()).toBe(true);
    });
  });

  describe('isChromiumBrowser', () => {
    it('returns true for Chrome browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        configurable: true,
      });
      // Mock chrome API
      (global.window as any).chrome = {};

      expect(isChromiumBrowser()).toBe(true);
    });

    it('returns true for Edge browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36 Edg/139.0.0.0',
        configurable: true,
      });
      (global.window as any).chrome = {};

      expect(isChromiumBrowser()).toBe(true);
    });

    it('returns true for Opera browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 OPR/122.0.0.0',
        configurable: true,
      });
      (global.window as any).chrome = {};

      expect(isChromiumBrowser()).toBe(true);
    });

    it('returns true for Samsung Browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36',
        configurable: true,
      });
      (global.window as any).chrome = {};

      expect(isChromiumBrowser()).toBe(true);
    });

    it('returns true for Brave browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      });
      (global.window as any).chrome = {};
      // Brave has the chrome API

      expect(isChromiumBrowser()).toBe(true);
    });

    it('returns false for Firefox browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0',
        configurable: true,
      });
      // Remove chrome API
      delete (global.window as any).chrome;

      expect(isChromiumBrowser()).toBe(false);
    });

    it('returns false for Safari on macOS', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
        configurable: true,
      });
      delete (global.window as any).chrome;

      expect(isChromiumBrowser()).toBe(false);
    });

    it('returns false for Safari on iOS', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
        configurable: true,
      });
      delete (global.window as any).chrome;

      expect(isChromiumBrowser()).toBe(false);
    });

    it('returns false for Firefox on iOS (FxiOS)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/141.1  Mobile/15E148 Safari/605.1.15',
        configurable: true,
      });
      delete (global.window as any).chrome;

      expect(isChromiumBrowser()).toBe(false);
    });

    it('returns false if chrome API is missing even with Chrome user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      });
      delete (global.window as any).chrome;

      expect(isChromiumBrowser()).toBe(false);
    });
  });
});
