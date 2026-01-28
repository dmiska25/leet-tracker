import { StrictMode } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import { ToastProvider } from '@/components/ui/toast';
import { PostHogProvider } from 'posthog-js/react';
import { TutorialProvider } from '@/tutorial/TutorialContext';
import { initializeTheme } from '@/hooks/useTheme';

function ConditionalPostHogProvider({ children }: { children: React.ReactNode }) {
  const isProduction = import.meta.env.PROD;

  if (!isProduction) {
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
      options={{
        api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
        defaults: '2025-05-24',
        capture_exceptions: true,
      }}
    >
      {children}
    </PostHogProvider>
  );
}

// Initialize theme immediately before React renders to prevent flash
initializeTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConditionalPostHogProvider>
        <ErrorBoundary>
          <ToastProvider>
            <TutorialProvider>
              <App />
            </TutorialProvider>
          </ToastProvider>
        </ErrorBoundary>
      </ConditionalPostHogProvider>
    </BrowserRouter>
  </StrictMode>,
);
