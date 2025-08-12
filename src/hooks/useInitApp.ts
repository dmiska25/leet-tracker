import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { initApp, resetRecentSolvesCache } from '@/domain/initApp';
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

  /* Shared loader so we can call it from useEffect and refresh() */
  const load = async () => {
    try {
      const { username, progress, errors, extensionInstalled } = await initApp();

      errors.map((error) => {
        toast(error, 'error');
      });

      setState({
        loading: false,
        username,
        progress: progress ?? [],
        criticalError: false,
        extensionInstalled,
      });
    } catch (err: any) {
      console.error('[useInitApp] initApp failed', err);
      setState({ loading: false, progress: [], criticalError: true, extensionInstalled: false });
    }
  };

  /* Run once on mount */
  useEffect(() => {
    load();
  }, []);

  /* Public helper – used by the "Sync Now” button */
  const refresh = async () => {
    setState((s) => ({ ...s, loading: true, criticalError: false }));
    resetRecentSolvesCache();
    await load();
  };

  return { ...state, refresh };
}
