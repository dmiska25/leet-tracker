import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { initApp } from '@/domain/initApp';
import type { CategoryProgress } from '@/types/progress';

interface InitState {
  loading: boolean;
  username?: string;
  progress: CategoryProgress[];
  criticalError: boolean;
  extensionInstalled: boolean;
}

export function useInitApp() {
  const toast = useToast();
  const [state, setState] = useState<InitState>({
    loading: true,
    progress: [],
    criticalError: false,
    extensionInstalled: false,
  });

  /* Shared loader so we can call it from useEffect, refresh(), and silentRefresh() */
  const load = async (dontShowCriticalError: boolean = false) => {
    try {
      const { username, progress, errors, extensionInstalled } = await initApp();

      errors.forEach((error) => {
        toast(error, 'error');
      });

      setState((prevState) => ({
        ...prevState,
        loading: false,
        username,
        progress: progress ?? [],
        criticalError: false,
        extensionInstalled,
      }));
    } catch (err: any) {
      console.error('[useInitApp] initApp failed', err);
      if (!dontShowCriticalError) {
        setState({ loading: false, progress: [], criticalError: true, extensionInstalled: false });
      }
      // Silent refresh: don't show critical error, just log it
    }
  };

  /* Run once on mount */
  useEffect(() => {
    load();
  }, []);

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
  }, [toast]);

  return { ...state, refresh, silentRefresh };
}
