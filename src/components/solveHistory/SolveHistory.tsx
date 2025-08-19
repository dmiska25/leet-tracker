import { useState, useEffect } from 'react';
import SolveSidebar from './SolveSidebar';
import SolveDetail from './SolveDetail';
import { useSolveHistory } from '@/hooks/useSolveHistory';
import type { Solve } from '@/types/types';

/** Stable composite key for a solve */
const solveId = (s: Solve) => `${s.slug}|${s.timestamp}`;

export default function SolveHistory() {
  const { loading, solves, refresh } = useSolveHistory();

  /* ---------- UI state ---------- */
  const [sidebarOpen, setSidebarOpen] = useState(true); // desktop (≥ sm)
  const [mobileView, setMobileView] = useState<'listing' | 'details'>('listing'); // < sm
  const [selected, setSelected] = useState<Solve | null>(null);

  /* Sync the selected solve reference when the solves list updates */
  useEffect(() => {
    if (selected) {
      const id = solveId(selected);
      const fresh = solves.find((s) => solveId(s) === id);
      if (fresh && fresh !== selected) {
        setSelected(fresh);
      }
    }
  }, [solves]);

  /* Select most-recent solve on first successful load */
  useEffect(() => {
    if (!loading && !selected && solves.length) {
      setSelected(solves[0]);
    }
  }, [loading, solves, selected]);

  if (loading) return <p className="p-6">Loading…</p>;
  if (!solves.length) return <p className="p-6">No solves found.</p>;

  /* ---------- handlers ---------- */
  const selectSolve = (s: Solve) => {
    setSelected(s);
    if (window.innerWidth < 640) {
      setMobileView('details'); // take over full width on mobile
    }
  };

  const hideSidebar = () => {
    if (window.innerWidth < 640) {
      setMobileView('details');
    } else {
      setSidebarOpen(false);
    }
  };

  const showList = () => {
    if (window.innerWidth < 640) {
      setMobileView('listing');
    } else {
      setSidebarOpen(true);
    }
  };

  /* ---------- render ---------- */
  const listVisible =
    typeof window !== 'undefined' && window.innerWidth < 640
      ? mobileView === 'listing'
      : sidebarOpen;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div
        className={`relative flex h-[calc(100vh-8rem)] transition-[gap] duration-300 ease-in-out ${
          sidebarOpen ? 'sm:gap-6' : 'sm:gap-0'
        }`}
      >
        {/* ───────── Listing / Sidebar ───────── */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out
            ${mobileView === 'listing' ? 'basis-full opacity-100' : 'basis-0 opacity-0'}
            ${sidebarOpen ? 'sm:basis-[20rem] sm:flex-none sm:opacity-100' : 'sm:basis-0 sm:opacity-0'}
          `}
          data-tour="solve-history-list"
        >
          <SolveSidebar
            solves={solves}
            selectedId={selected ? solveId(selected) : null}
            onSelect={selectSolve}
            onHide={hideSidebar}
          />
        </div>

        {/* ───────── Detail Pane ───────── */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out
            ${mobileView === 'details' ? 'basis-full opacity-100' : 'basis-0 opacity-0'}
            sm:flex-1 sm:min-w-0 sm:opacity-100
          `}
        >
          <div className="w-full max-w-4xl mx-auto">
            {selected ? (
              <SolveDetail
                solve={selected}
                onSaved={refresh}
                onShowList={showList}
                showListButton={!listVisible}
              />
            ) : (
              <p className="p-6 text-muted-foreground">Select a solve to view details.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
