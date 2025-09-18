import type { Solve, CodeSnapshot } from '@/types/types';

/* ---------------------------------------------------------- */
/*  Types                                                     */
/* ---------------------------------------------------------- */

export interface TimelineEvent {
  id: string;
  timestamp: number; // ms
  type: 'snapshot' | 'run' | 'final';
  label: string;
  code: string;
  index: number; // for ordering
  isCheckpoint?: boolean; // True for checkpoints, runs, and final submissions
}

export type ReconCache = { lastIdx: number; code: string } | null;

/* ---------------------------------------------------------- */
/*  Core Utilities                                           */
/* ---------------------------------------------------------- */

/** Check if solve has meaningful timeline data (snapshots or runs) */
export const hasMeaningfulTimelineData = (solve: Solve): boolean => {
  // Check for snapshots
  const hasSnapshots =
    solve.codingJourney &&
    'snapshots' in solve.codingJourney &&
    solve.codingJourney.snapshots &&
    solve.codingJourney.snapshots.length > 0;

  // Check for runs
  const hasRuns =
    solve.runEvents && solve.runEvents.runs && solve.runEvents.runs.some((run) => run.startedAt);

  return !!(hasSnapshots || hasRuns);
};

/* ---------------------------------------------------------- */
/*  Patch Processing                                         */
/* ---------------------------------------------------------- */

let _dmpInstance: any | null = null;

async function getDMP(): Promise<any | null> {
  if (_dmpInstance) return _dmpInstance;
  try {
    const mod: any = await import('diff-match-patch');
    const Ctor = mod.diff_match_patch || mod;
    _dmpInstance = new Ctor();
    return _dmpInstance;
  } catch {
    return null;
  }
}

/** Apply patch using diff-match-patch library */
export const applyPatch = async (prev: string, patchText: string): Promise<string> => {
  const dmp = await getDMP();
  if (!dmp) return prev;
  try {
    const patches = dmp.patch_fromText(patchText);
    const [next] = dmp.patch_apply(patches, prev);
    return typeof next === 'string' ? next : prev;
  } catch {
    return prev;
  }
};

/** Find nearest checkpoint with fullCode */
export const nearestCheckpointIndex = (snapshots: CodeSnapshot[], targetIdx: number): number => {
  for (let i = targetIdx; i >= 0; i--) {
    if (typeof snapshots[i]?.fullCode === 'string') return i;
  }
  return -1;
};

/* ---------------------------------------------------------- */
/*  Code Reconstruction                                      */
/* ---------------------------------------------------------- */

/**
 * Reconstruct code at target index using:
 * 1) incremental cache if it exists and ≤ target, otherwise
 * 2) nearest earlier checkpoint with `fullCode`.
 * Applies patches forward from base to target.
 */
export async function reconstructWithCache(
  snapshots: CodeSnapshot[],
  targetIdx: number,
  cache: ReconCache,
): Promise<{ code?: string; cache: ReconCache }> {
  if (targetIdx < 0 || targetIdx >= snapshots.length) return { code: undefined, cache };

  // Choose base: prefer cache if it's ahead of the nearest checkpoint and ≤ target
  const cpIdx = nearestCheckpointIndex(snapshots, targetIdx);
  let baseIdx = cpIdx;
  let code: string | undefined;

  if (cache && cache.lastIdx >= 0 && cache.lastIdx <= targetIdx) {
    // If cache is usable and more recent than checkpoint, start from cache
    if (cache.lastIdx >= cpIdx) {
      baseIdx = cache.lastIdx;
      code = cache.code;
    }
  }

  if (code === undefined) {
    if (baseIdx === -1) return { code: undefined, cache }; // no base available
    code = snapshots[baseIdx].fullCode as string;
  }

  // Walk forward applying patches or using fullCode checkpoints
  for (let i = baseIdx + 1; i <= targetIdx; i++) {
    const s = snapshots[i];
    if (typeof s.fullCode === 'string') {
      code = s.fullCode;
    } else if (s.patchText) {
      code = await applyPatch(code, s.patchText);
    } else if (s.patch) {
      code = await applyPatch(code, s.patch);
    } else {
      // no change
    }
  }

  return { code, cache: { lastIdx: targetIdx, code } };
}

/**
 * Simple code reconstruction for UI components (without advanced caching).
 * Uses basic ref-based caching for performance.
 */
export async function reconstructCode(
  snapshots: CodeSnapshot[],
  targetIdx: number,
  cacheRef?: { current: ReconCache },
): Promise<string> {
  if (targetIdx < 0 || targetIdx >= snapshots.length) return '';

  const cache = cacheRef?.current || null;
  const { code, cache: newCache } = await reconstructWithCache(snapshots, targetIdx, cache);

  // Update cache ref if provided
  if (cacheRef) {
    cacheRef.current = newCache;
  }

  return code || '';
}

/* ---------------------------------------------------------- */
/*  Timeline Building                                        */
/* ---------------------------------------------------------- */

/** Build timeline events from solve data for UI display */
export async function buildTimelineEvents(solve: Solve): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  // Add ALL snapshots from coding journey
  if (solve.codingJourney && 'snapshots' in solve.codingJourney && solve.codingJourney.snapshots) {
    const snapshots = solve.codingJourney.snapshots;
    let cache: ReconCache = null;

    for (let i = 0; i < snapshots.length; i++) {
      const snapshot = snapshots[i];

      // Reconstruct code for this snapshot using caching
      let code = snapshot.fullCode || '';
      if (!code) {
        const result = await reconstructWithCache(snapshots, i, cache);
        code = result.code || '';
        cache = result.cache;
      }

      events.push({
        id: `snapshot-${i}`,
        timestamp: snapshot.timestamp || 0,
        type: 'snapshot',
        label: snapshot.isCheckpoint ? `Checkpoint ${i + 1}` : `Snapshot ${i + 1}`,
        code,
        index: 0, // Will be set after sorting
        isCheckpoint: !!snapshot.isCheckpoint,
      });
    }
  }

  // Add ALL runs with timestamps
  if (solve.runEvents && solve.runEvents.runs) {
    for (const run of solve.runEvents.runs) {
      if (run.startedAt) {
        events.push({
          id: `run-${run.id || Math.random()}`,
          timestamp: run.startedAt,
          type: 'run',
          label: `Run ${events.filter((e) => e.type === 'run').length + 1}`,
          code: run.code || '',
          index: 0, // Will be set after sorting
          isCheckpoint: true, // All runs are big events
        });
      }
    }
  }

  // Add final submission
  if (solve.code) {
    events.push({
      id: 'final',
      timestamp: solve.timestamp * 1000, // Convert to ms
      type: 'final',
      label: 'Final Submission',
      code: solve.code,
      index: 0, // Will be set after sorting
      isCheckpoint: true, // Final submission is a big event
    });
  }

  // Sort by timestamp chronologically
  const sortedEvents = events.sort((a, b) => {
    const ta = a.timestamp || 0;
    const tb = b.timestamp || 0;
    return ta - tb;
  });

  // Assign the correct index based on sorted order
  return sortedEvents.map((event, index) => ({
    ...event,
    index,
  }));
}

/* ---------------------------------------------------------- */
/*  Time Formatting Utilities                               */
/* ---------------------------------------------------------- */

/** Format timestamp for timeline display */
export const formatSnapshotTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/** Calculate elapsed time from start */
export const formatElapsedTime = (startTime: number, currentTime: number): string => {
  const elapsedMs = currentTime - startTime;
  const elapsedMinutes = elapsedMs / (1000 * 60);

  if (elapsedMinutes < 1) {
    return `${Math.round(elapsedMs / 1000)}s`;
  } else if (elapsedMinutes < 60) {
    return `${elapsedMinutes.toFixed(1)}min`;
  } else {
    const hours = elapsedMinutes / 60;
    return `${hours.toFixed(1)}h`;
  }
};

/* ---------------------------------------------------------- */
/*  Legacy Support Functions                                */
/* ---------------------------------------------------------- */

/**
 * Legacy patch application for backward compatibility.
 * Use applyPatch() directly in new code.
 */
export const applyPatchLegacy = applyPatch;

/**
 * Legacy checkpoint finder for backward compatibility.
 * Use nearestCheckpointIndex() directly in new code.
 */
export const findNearestCheckpoint = nearestCheckpointIndex;
