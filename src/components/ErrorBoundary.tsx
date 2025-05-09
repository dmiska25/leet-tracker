import { Component, ErrorInfo, ReactNode } from 'react';

/**
 * Catches unrecoverable rendering/runtime errors anywhere below it and shows
 * a simple full‑screen fallback UI with a reload button.
 *
 * This should *never* appear in normal use, but gives us a last‑resort escape
 * hatch if something catastrophic happens.
 */
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // You could send this to Sentry / LogRocket etc.
    console.error('[ErrorBoundary] Unhandled app error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="mb-4 text-sm text-muted-foreground max-w-sm text-center">
            An unexpected error occurred. You can try reloading the page to start fresh.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
