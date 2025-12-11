import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { fetchProblemCatalog } from '../api/leetcode';
import { syncDemoSolves } from '../api/demo';
import { Difficulty, Problem, Solve, GoalProfile } from '../types/types';
import { syncFromExtension } from './extensionSync';
import { initApp } from './initApp';

vi.mock('../storage/db');
vi.mock('../api/leetcode');
vi.mock('../api/demo');
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

  it('continues when catalog fetch fails (catalog loaded separately now)', async () => {
    // Catalog is now loaded separately via initProblemCatalog(), not in initApp()
    // So catalog failures don't appear in initApp() errors anymore
    vi.mocked(fetchProblemCatalog).mockRejectedValue(new Error('network'));
    const res = await initApp();
    expect(res.username).toBe('user');
    expect(res.progress).toBeDefined();
    expect(res.errors).toEqual([]);
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

  it('loads demo data for demo user instead of extension sync', async () => {
    // Set demo username in env
    vi.stubEnv('VITE_DEMO_USERNAME', 'test-demo-user');
    vi.mocked(db.getUsername).mockResolvedValue('test-demo-user');

    // Mock syncDemoSolves to return number of saved solves
    vi.mocked(syncDemoSolves).mockResolvedValue(5);

    const res = await initApp();

    // Should NOT call syncFromExtension for demo user
    expect(syncFromExtension).not.toHaveBeenCalled();
    // Should call syncDemoSolves with db instance
    expect(syncDemoSolves).toHaveBeenCalledWith(db);
    expect(res.extensionInstalled).toBe(false);
    expect(res.username).toBe('test-demo-user');
    expect(res.errors).toEqual([]);

    vi.unstubAllEnvs();
  });
});
