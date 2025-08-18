// Global test setup to suppress common console warnings and errors

// Store original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Patterns to suppress (add more as needed)
const suppressedErrorPatterns = [
  /Warning: An update to .* inside a test was not wrapped in act/,
  /The current testing environment is not configured to support act/,
  /Warning: ReactDOM.render is no longer supported/,
  /Warning: .* is deprecated/,
  /Not implemented: navigation/,
];

const suppressedWarnPatterns = [/Received NaN for the `value` attribute/];

// Custom console.error that filters out known test warnings
console.error = (...args: any[]) => {
  const message = args.join(' ');

  // Check if this error should be suppressed
  const shouldSuppress = suppressedErrorPatterns.some((pattern) => pattern.test(message));

  if (!shouldSuppress) {
    originalConsoleError.apply(console, args);
  }
};

// Custom console.warn that filters out known test warnings
console.warn = (...args: any[]) => {
  const message = args.join(' ');

  // Check if this warning should be suppressed
  const shouldSuppress = suppressedWarnPatterns.some((pattern) => pattern.test(message));

  if (!shouldSuppress) {
    originalConsoleWarn.apply(console, args);
  }
};

// Handle unhandled promise rejections from tests
const originalUnhandledRejection = process.listeners('unhandledRejection');
process.removeAllListeners('unhandledRejection');

process.on('unhandledRejection', (reason: any) => {
  // Suppress expected test errors
  if (reason && reason.message === 'DB Error') {
    return; // This is an expected test error, ignore it
  }

  // For other rejections, call the original handlers
  originalUnhandledRejection.forEach((handler) => {
    if (typeof handler === 'function') {
      handler(reason, Promise.resolve());
    }
  });
});
