import { Solve } from '../types/types';

const SESSION_GAP_SECONDS = 4 * 60 * 60; // 4 hours

/**
 * Groups solves by problem slug, then clusters them into sessions based on time gaps.
 * A session is defined as a sequence of solves where each solve is within
 * SESSION_GAP_SECONDS of the adjacent one in a sorted list.
 *
 * @param solves List of solves (order doesn't matter, will be sorted inside)
 * @returns Array of groups, where each group is an array of Solves belonging to one session.
 *          The groups are sorted by the timestamp of the most recent solve in the group (descending).
 *          Inside each group, solves are also sorted by timestamp descending.
 */
export function groupSolvesBySession(solves: Solve[]): Solve[][] {
  if (solves.length === 0) return [];

  // 1. Bucket by slug
  const bySlug = new Map<string, Solve[]>();
  for (const s of solves) {
    if (!bySlug.has(s.slug)) bySlug.set(s.slug, []);
    bySlug.get(s.slug)!.push(s);
  }

  const sessions: Solve[][] = [];

  // 2. For each slug, sort by time and group
  for (const slugSolves of bySlug.values()) {
    // Sort descending (newest first)
    slugSolves.sort((a, b) => b.timestamp - a.timestamp);

    let currentGroup: Solve[] = [slugSolves[0]];

    for (let i = 1; i < slugSolves.length; i++) {
      const newer = slugSolves[i - 1];
      const older = slugSolves[i];

      // If the gap is small enough, they belong to the same session
      if (newer.timestamp - older.timestamp <= SESSION_GAP_SECONDS) {
        currentGroup.push(older);
      } else {
        // Gap too large, finalize current group and start a new one
        sessions.push(currentGroup);
        currentGroup = [older];
      }
    }
    // Push the final group
    sessions.push(currentGroup);
  }

  // 3. Sort all sessions by the timestamp of their most recent solve (head)
  // Since we sorted slugSolves desc and pushed roughly in order,
  // and constructed currentGroup with [0] as head, index 0 is always the newest in that group.
  sessions.sort((a, b) => b[0].timestamp - a[0].timestamp);

  return sessions;
}
