import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDemoSolves } from './demo';

const exampleSolves = [
  { slug: 'one', title: 'One', timestamp: 1_600_000_000, status: 'Accepted', lang: 'ts' },
  { slug: 'two', title: 'Two', timestamp: 1_600_000_100, status: 'Accepted', lang: 'ts' },
];

describe('loadDemoSolves', () => {
  beforeEach(() => {
    //   Tue 4 Feb 2025 12:00:00 UTC  →  last Saturday = 1 Feb 2025
    vi.setSystemTime(new Date('2025-02-04T12:00:00Z'));
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => exampleSolves } as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('scales timestamps to the two-week window ending last Saturday', async () => {
    const scaled = await loadDemoSolves();

    expect(scaled).toHaveLength(exampleSolves.length);

    // compute expected range (same algorithm as in loadDemoSolves)
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() - now.getDay() - 1); // last Saturday
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 13);

    const newStart = Math.floor(startDate.getTime() / 1000);
    const newEnd = Math.floor(endDate.getTime() / 1000);

    const timestamps = scaled.map((s) => s.timestamp);
    expect(Math.min(...timestamps)).toBeGreaterThanOrEqual(newStart);
    expect(Math.max(...timestamps)).toBeLessThanOrEqual(newEnd);

    // order should be preserved
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });
});
