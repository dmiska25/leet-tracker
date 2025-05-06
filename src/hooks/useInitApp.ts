import { useEffect, useState } from 'react';
import { initApp } from '@/domain/initApp';
import { CategoryProgress } from '@/types/progress';

interface InitState {
  loading: boolean;
  username?: string;
  progress: CategoryProgress[];
}

export function useInitApp() {
  const [state, setState] = useState<InitState>({ loading: true, progress: [] });

  /* shared loader so we can call it from useEffect and refresh() */
  const load = async () => {
    try {
      const { username, progress } = await initApp();
      setState({ loading: false, username, progress: progress ?? [] });
    } catch (err) {
      console.error('[useInitApp] initApp failed', err);
      setState({ loading: false, progress: [] });
    }
  };

  /* run once on mount */
  useEffect(() => {
    load();
  }, []);

  /* public helper – used by the Sync button */
  const refresh = async () => {
    setState((s) => ({ ...s, loading: true }));
    await load();
  };

  return { ...state, refresh };
}
