import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import App from './App.tsx';
import { ToastProvider } from '@/components/ui/toast';

// inject Umami script
function UmamiScript() {
  useEffect(() => {
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.dataset.websiteId = '2e4a1523-576e-4fcb-a665-231032b8632e';
    script.src = 'https://analytics.umami.is/script.js';
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UmamiScript />
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
