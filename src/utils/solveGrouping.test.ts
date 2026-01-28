import { describe, it, expect } from 'vitest';
import { groupSolvesBySession } from './solveGrouping';
import type { Solve } from '../types/types';

function makeSolve(slug: string, timestamp: number): Solve {
  return {
    slug,
    title: slug,
    timestamp,
    status: 'Accepted',
    lang: 'typescript',
    id: `${slug}-${timestamp}`,
  } as Solve;
}

describe('groupSolvesBySession', () => {
  it('groups solves for the same problem within 4 hours', () => {
    const now = 10000;
    const s1 = makeSolve('p1', now);
    const s2 = makeSolve('p1', now - 3600); // 1h gap
    const s3 = makeSolve('p1', now - 3600 * 3); // 3h gap from s1, 2h from s2

    // All within 4h of neighbors?
    // Ordered: s1 (0), s2 (-1h), s3 (-3h)
    // s1-s2 = 1h <= 4h -> same
    // s2-s3 = 2h <= 4h -> same
    const result = groupSolvesBySession([s1, s3, s2]);

    expect(result.length).toBe(1);
    expect(result[0]).toEqual([s1, s2, s3]);
  });

  it('starts new session if gap > 4 hours', () => {
    const now = 20000;
    const s1 = makeSolve('p1', now);
    const s2 = makeSolve('p1', now - 3600 * 5); // 5h gap

    const result = groupSolvesBySession([s1, s2]);

    expect(result.length).toBe(2);
    // Sorted by most recent
    expect(result[0]).toEqual([s1]);
    expect(result[1]).toEqual([s2]);
  });

  it('keeps different problems in separate sessions', () => {
    const now = 30000;
    const s1 = makeSolve('p1', now);
    const s2 = makeSolve('p2', now); // Same time, diff problem

    const result = groupSolvesBySession([s1, s2]);

    expect(result.length).toBe(2);
    // Order depends on slug iteration order inside map, BUT final sort is by timestamp.
    // Timestamps equal -> stable sort irrelevant here, but both should exist.
    expect(result.flat()).toHaveLength(2);
    const slugs = result.map((g) => g[0].slug);
    expect(slugs).toContain('p1');
    expect(slugs).toContain('p2');
  });

  it('handles mixed problems and sessions correctly', () => {
    const now = 40000;
    /*
      p1: [now, now-1h] -> Session A
      p1: [now-10h] -> Session B
      p2: [now-2h] -> Session C
    */
    const p1_recent1 = makeSolve('p1', now);
    const p1_recent2 = makeSolve('p1', now - 3600);
    const p1_old = makeSolve('p1', now - 36000);
    const p2_recent = makeSolve('p2', now - 7200);

    const inputs = [p1_old, p2_recent, p1_recent2, p1_recent1];
    const result = groupSolvesBySession(inputs);

    // Expected sessions sorted by head timestamp:
    // 1. Session A (p1, head=now)
    // 2. Session C (p2, head=now-2h)
    // 3. Session B (p1, head=now-10h)

    expect(result.length).toBe(3);

    expect(result[0][0].slug).toBe('p1');
    expect(result[0]).toHaveLength(2); // p1_recent1, p1_recent2

    expect(result[1][0].slug).toBe('p2');
    expect(result[1]).toHaveLength(1);

    expect(result[2][0].slug).toBe('p1');
    expect(result[2]).toHaveLength(1); // p1_old
  });

  it('returns empty array for empty input', () => {
    expect(groupSolvesBySession([])).toEqual([]);
  });
});
