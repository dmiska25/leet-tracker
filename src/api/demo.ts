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
  const originalRange = originalEnd - originalStart;

  const newStart = Math.floor(startDate.getTime() / 1000);
  const newEnd = Math.floor(endDate.getTime() / 1000);
  const newRange = newEnd - newStart;

  const scaledSolves = solves.map((solve) => {
    const scaledTimestamp =
      newStart + ((solve.timestamp - originalStart) / originalRange) * newRange;
    return { ...solve, timestamp: Math.floor(scaledTimestamp) };
  });

  return scaledSolves;
}
