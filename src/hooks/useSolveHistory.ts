import { useEffect, useState, useCallback } from 'react';
import { db } from '@/storage/db';
import type { Solve } from '@/types/types';

interface State {
  loading: boolean;
  solves: Solve[];
}

/**
 * Loads the full solve list from IndexedDB (newest first) and provides
 * a refresh helper for when a solve is updated in place.
 */
export function useSolveHistory() {
  const [state, setState] = useState<State>({ loading: true, solves: [] });

  const load = useCallback(async () => {
    const solves = await db.getAllSolvesSorted();
    setState({ loading: false, solves });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Re-read solves from the DB (e.g. after an edit) */
  const refresh = async () => {
    setState((s) => ({ ...s, loading: true }));
    await load();
  };

  return { ...state, refresh };
}
