import { Solve } from '@/types/types';

/**
 * Adjusts demo solve timestamps to fit within the previous two-week period.
 * Timestamps are consistent per week - they only change when a new week begins.
 */
export async function loadDemoSolves(): Promise<Solve[]> {
  const res = await fetch('/demo-solves.json');
  if (!res.ok) {
    throw new Error(`Failed to load demo solves (HTTP ${res.status})`);
  }

  const solves = (await res.json()) as Solve[];

  // Get the most recent Saturday at midnight (end date) - this stays the same for the entire week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - dayOfWeek - 1); // Last Saturday
  endDate.setHours(0, 0, 0, 0); // Set to midnight for consistency

  // Start date is two weeks before the end date
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 13); // Two weeks before

  // Scale the timestamps to fit within the new range
  const originalStart = Math.min(...solves.map((s) => s.timestamp));
  const originalEnd = Math.max(...solves.map((s) => s.timestamp));
  const originalRange = Math.max(1, originalEnd - originalStart); // Avoid division by zero

  const newStart = Math.floor(startDate.getTime() / 1000);
  const newEnd = Math.floor(endDate.getTime() / 1000);
  const newRange = newEnd - newStart;

  const scaledSolves = solves.map((solve) => {
    const scaledTimestamp =
      newStart + ((solve.timestamp - originalStart) / originalRange) * newRange;

    // Scale timeline data timestamps the same way
    let scaledCodingJourney = solve.codingJourney;
    if (
      solve.codingJourney &&
      'snapshots' in solve.codingJourney &&
      solve.codingJourney.snapshots
    ) {
      const scaledSnapshots = solve.codingJourney.snapshots.map((snapshot) => ({
        ...snapshot,
        timestamp: snapshot.timestamp
          ? Math.floor(
              newStart + ((snapshot.timestamp / 1000 - originalStart) / originalRange) * newRange,
            ) * 1000
          : snapshot.timestamp,
      }));

      scaledCodingJourney = {
        ...solve.codingJourney,
        snapshots: scaledSnapshots,
        firstSnapshot: scaledSnapshots[0]?.timestamp || solve.codingJourney.firstSnapshot,
        lastSnapshot:
          scaledSnapshots[scaledSnapshots.length - 1]?.timestamp ||
          solve.codingJourney.lastSnapshot,
      };
    }

    // Scale run event timestamps
    let scaledRunEvents = solve.runEvents;
    if (solve.runEvents && solve.runEvents.runs) {
      const scaledRuns = solve.runEvents.runs.map((run) => ({
        ...run,
        startedAt: run.startedAt
          ? Math.floor(
              newStart + ((run.startedAt / 1000 - originalStart) / originalRange) * newRange,
            ) * 1000
          : run.startedAt,
      }));

      scaledRunEvents = {
        ...solve.runEvents,
        runs: scaledRuns,
        firstRun: scaledRuns[0]?.startedAt || solve.runEvents.firstRun,
        lastRun: scaledRuns[scaledRuns.length - 1]?.startedAt || solve.runEvents.lastRun,
        _window: solve.runEvents._window
          ? {
              startMs: Math.floor(scaledTimestamp * 1000 - (solve.timeUsed || 300) * 1000),
              endMs: Math.floor(scaledTimestamp * 1000),
            }
          : solve.runEvents._window,
      };
    }

    return {
      ...solve,
      timestamp: Math.floor(scaledTimestamp),
      codingJourney: scaledCodingJourney,
      runEvents: scaledRunEvents,
    };
  });

  return scaledSolves;
}
