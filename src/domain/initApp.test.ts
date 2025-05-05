import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { fetchProblemCatalog, fetchRecentSolves } from '../api/leetcode';
import { Difficulty, Problem, Solve, GoalProfile } from '../types/types';
import { initApp } from './initApp';

vi.mock('../storage/db');
vi.mock('../api/leetcode');

const mockProblems: Problem[] = [
  {
    slug: 'p',
    title: 'P',
    tags: ['Array'],
    description: '',
    difficulty: Difficulty.Easy,
    popularity: 0.8,
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
    vi.mocked(db.getUsername).mockResolvedValue('user');
    vi.mocked(db.getProblemListLastUpdated).mockResolvedValue(undefined);
    vi.mocked(db.saveGoalProfile).mockResolvedValue('default');
    vi.mocked(db.setActiveGoalProfile).mockResolvedValue('default');
    vi.mocked(fetchProblemCatalog).mockResolvedValue(mockProblems);
    vi.mocked(fetchRecentSolves).mockResolvedValue(mockSolves);
    vi.mocked(db.getAllSolves).mockResolvedValue(mockSolves);
    vi.mocked(db.withTransaction).mockImplementation(async (_, cb) =>
      cb({ objectStore: () => ({ put: vi.fn(), get: vi.fn() }) } as any),
    );
  });

  it('handles missing username path', async () => {
    vi.mocked(db.getUsername).mockResolvedValue(undefined);
    const res = await initApp();
    expect(res).toEqual({ username: undefined, progress: undefined });
  });

  it('returns progress with default goals when no profile', async () => {
    vi.mocked(db.getActiveGoalProfileId).mockResolvedValue(undefined);
    const res = await initApp();
    // Default profile should include "Array" and goal 0.6
    const arr = res.progress?.find((p) => p.tag === 'Array');
    expect(arr?.goal).toBeCloseTo(0.6);
    expect(res.progress?.length).toBeGreaterThan(0);
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
  });

  it('continues when catalog fetch fails', async () => {
    vi.mocked(fetchProblemCatalog).mockRejectedValue(new Error('network'));
    const res = await initApp();
    expect(res.username).toBe('user');
    expect(res.progress).toBeDefined();
  });

  it('continues when recent solve sync fails', async () => {
    vi.mocked(fetchRecentSolves).mockRejectedValue(new Error('api down'));
    const res = await initApp();
    expect(res.progress?.length).toBeGreaterThan(0);
  });
});
