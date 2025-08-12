import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { fetchProblemCatalog, fetchRecentSolves } from '../api/leetcode';
import { Difficulty, Problem, Solve, GoalProfile } from '../types/types';
import { syncFromExtension } from './extensionSync';
import { initApp } from './initApp';

vi.mock('../storage/db');
vi.mock('../api/leetcode');
vi.mock('./extensionSync');

const mockProblems: Problem[] = [
  {
    slug: 'p',
    title: 'P',
    tags: ['Array'],
    description: '',
    difficulty: Difficulty.Easy,
    popularity: 0.8,
    isPaid: false,
    isFundamental: true,
    createdAt: 0,
  },
];
const now = Math.floor(Date.now() / 1000);
const mockSolves: Solve[] = [
  {
    slug: 'p',
    title: 'P',
    timestamp: now,
    status: 'Accepted',
    lang: 'ts',
    difficulty: Difficulty.Easy,
    tags: ['Array'],
  },
];

describe('initApp', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    /* db mocks */
    vi.mocked(db.getUsername).mockResolvedValue('user');
    vi.mocked(db.getProblemListLastUpdated).mockResolvedValue(undefined);
    vi.mocked(db.getRecentSolvesLastUpdated).mockResolvedValue(undefined);
    vi.mocked(db.setRecentSolvesLastUpdated).mockResolvedValue('');
    vi.mocked(db.saveGoalProfile).mockResolvedValue('default');
    vi.mocked(db.setActiveGoalProfile).mockResolvedValue('default');
    vi.mocked(db.getAllSolves).mockResolvedValue(mockSolves);
    vi.mocked(db.withTransaction).mockImplementation(async (_, cb) =>
      cb({ objectStore: () => ({ put: vi.fn(), get: vi.fn() }) } as any),
    );

    /* API mocks */
    vi.mocked(fetchProblemCatalog).mockResolvedValue(mockProblems);
    vi.mocked(fetchRecentSolves).mockResolvedValue(mockSolves);
  });

  it('handles missing username path', async () => {
    vi.mocked(db.getUsername).mockResolvedValue(undefined);
    const res = await initApp();
    expect(res).toEqual({
      username: undefined,
      progress: undefined,
      errors: [],
      extensionInstalled: false,
    });
  });

  it('returns progress with default goals when no profile', async () => {
    vi.mocked(db.getActiveGoalProfileId).mockResolvedValue(undefined);
    const res = await initApp();
    const arr = res.progress?.find((p) => p.tag === 'Array');
    expect(arr?.goal).toBeCloseTo(0.6);
    expect(res.errors).toEqual([]);
  });

  it('applies goal profile override', async () => {
    const profile: GoalProfile = {
      id: 'g',
      name: 'Goals',
      description: '',
      goals: { Array: 0.9 } as any,
      createdAt: '',
      isEditable: true,
    };
    vi.mocked(db.getActiveGoalProfileId).mockResolvedValue('g');
    vi.mocked(db.getGoalProfile).mockResolvedValue(profile);
    const res = await initApp();
    const arr = res.progress?.find((p) => p.tag === 'Array');
    expect(arr?.goal).toBeCloseTo(0.9);
    expect(res.errors).toEqual([]);
  });

  it('continues when catalog fetch fails and returns error message', async () => {
    vi.mocked(fetchProblemCatalog).mockRejectedValue(new Error('network'));
    const res = await initApp();
    expect(res.username).toBe('user');
    expect(res.progress).toBeDefined();
    expect(res.errors).toContain(
      'An unexpected error occurred, new problems are temporarily unavailable.',
    );
  });

  it('continues when recent solve sync fails and returns error message', async () => {
    vi.mocked(fetchRecentSolves).mockRejectedValue(new Error('api down'));
    const res = await initApp();
    expect(res.progress?.length).toBeGreaterThan(0);
    expect(res.errors).toContain(
      'An unexpected error occurred, recent solves are temporarily unavailable.',
    );
  });

  it('maps RATE_LIMITED error to user‑friendly message', async () => {
    const err: any = new Error('Rate limited');
    err.code = 'RATE_LIMITED';
    vi.mocked(fetchRecentSolves).mockRejectedValue(err);

    const res = await initApp();
    expect(res.errors).toContain(
      'LeetCode API rate limit hit — recent solves are temporarily unavailable.',
    );
  });
  it('handles successful extension sync', async () => {
    vi.mocked(syncFromExtension).mockResolvedValue(5); // Simulate 5 solves added via extension
    const res = await initApp();
    expect(res.extensionInstalled).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('handles extension unavailable gracefully', async () => {
    const err: any = new Error('Extension unavailable');
    err.code = 'EXTENSION_UNAVAILABLE';
    vi.mocked(syncFromExtension).mockRejectedValue(err);

    const res = await initApp();
    expect(res.extensionInstalled).toBe(false);
    expect(res.errors).toEqual([]);
  });

  it('handles unexpected extension sync errors', async () => {
    vi.mocked(syncFromExtension).mockRejectedValue(new Error('Unexpected error'));
    const res = await initApp();
    expect(res.extensionInstalled).toBe(false);
    expect(res.errors).toContain('An unexpected error occurred while syncing with the extension.');
  });

  it('skips recent solves fetch when cache is fresh', async () => {
    // Mock fresh timestamp (within 30 minutes)
    const recentTimestamp = Date.now() - 15 * 60 * 1000; // 15 minutes ago
    vi.mocked(db.getRecentSolvesLastUpdated).mockResolvedValue(recentTimestamp);

    const res = await initApp();

    // Should not have called fetchRecentSolves due to cache hit
    expect(fetchRecentSolves).not.toHaveBeenCalled();
    expect(res.errors).toEqual([]);
    expect(res.username).toBe('user');
  });

  it('fetches recent solves when cache is stale', async () => {
    // Mock stale timestamp (older than 30 minutes)
    const staleTimestamp = Date.now() - 45 * 60 * 1000; // 45 minutes ago
    vi.mocked(db.getRecentSolvesLastUpdated).mockResolvedValue(staleTimestamp);

    // Mock the transaction to capture put calls
    const mockPut = vi.fn();
    vi.mocked(db.withTransaction).mockImplementation(async (_, cb) =>
      cb({ objectStore: () => ({ put: mockPut, get: vi.fn() }) } as any),
    );

    const res = await initApp();

    // Should have called fetchRecentSolves due to stale cache
    expect(fetchRecentSolves).toHaveBeenCalledWith('user');
    expect(res.errors).toEqual([]);
    expect(res.username).toBe('user');

    // Should persist the new timestamp after a stale fetch
    const timestampPutCall = mockPut.mock.calls.find(
      ([, key]) => key === 'recentSolvesLastUpdated',
    );
    expect(timestampPutCall).toBeDefined();
    const [persistedTimestamp] = timestampPutCall!;
    expect(typeof persistedTimestamp).toBe('number');
    expect(persistedTimestamp).toBeGreaterThan(staleTimestamp);
  });

  it('skips recent solves fetch when cache is exactly 30 minutes old', async () => {
    // Use fake timers for deterministic testing
    vi.useFakeTimers();
    const now = 1723456789000; // Fixed timestamp for deterministic tests
    vi.setSystemTime(now);

    // Mock timestamp exactly 30 minutes ago (boundary case)
    const boundaryTimestamp = now - 30 * 60 * 1000; // Exactly 30 minutes ago
    vi.mocked(db.getRecentSolvesLastUpdated).mockResolvedValue(boundaryTimestamp);

    // Mock the transaction to capture put calls (should not be called)
    const mockPut = vi.fn();
    vi.mocked(db.withTransaction).mockImplementation(async (_, cb) =>
      cb({ objectStore: () => ({ put: mockPut, get: vi.fn() }) } as any),
    );

    const res = await initApp();

    // Should NOT call fetchRecentSolves (exactly 30 minutes is not stale yet)
    expect(fetchRecentSolves).not.toHaveBeenCalled();
    // Should NOT persist recent solves timestamp since we didn't fetch
    expect(mockPut).not.toHaveBeenCalledWith(expect.any(Number), 'recentSolvesLastUpdated');
    expect(res.errors).toEqual([]);
    expect(res.username).toBe('user');

    // Restore real timers
    vi.useRealTimers();
  });
});
