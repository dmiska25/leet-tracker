import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { initApp } from '@/domain/initApp';

interface InitState {
  loading: boolean; // Top-level loading ONLY (for initial App.tsx load)
  username?: string;
  criticalError: boolean;
}

export function useInitApp() {
  const toast = useToast();
  const [state, setState] = useState<InitState>({
    loading: true,
    criticalError: false,
  });

  /* Shared loader so we can call it from useEffect, refresh(), and silentRefresh() */
  const load = useCallback(
    async (dontShowCriticalError: boolean = false) => {
      try {
        const { username, errors } = await initApp();

        errors.forEach((error) => {
          toast(error, 'error');
        });

        setState({
          loading: false,
          username,
          criticalError: false,
        });
      } catch (err: any) {
        console.error('[useInitApp] initApp failed', err);
        if (!dontShowCriticalError) {
          setState({ loading: false, criticalError: true });
        }
        // Silent refresh: don't show critical error, just log it
      }
    },
    [toast],
  );

  /* Run once on mount */
  useEffect(() => {
    load();
  }, [load]);

  /**
   * Public helper – used by the "Sync Now" button.
   * @deprecated With automatic polling, prefer using silentRefresh() instead.
   */
  const refresh = async () => {
    setState((s) => ({ ...s, loading: true, criticalError: false }));
    await load();
  };

  /**
   * Silent refresh - updates data without showing loading spinner.
   * Used by automatic polling system to update UI seamlessly.
   */
  const silentRefresh = useCallback(async () => {
    // Don't set loading state - just update the data in background
    await load(true);
  }, [load]);

  return { ...state, refresh, silentRefresh };
}
