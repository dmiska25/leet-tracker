import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../storage/db';
import { Difficulty, Solve } from '../types/types';
import { initApp } from './initApp';
import { syncSolveData } from './syncSolveData';

vi.mock('../storage/db');
vi.mock('./syncSolveData');

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
    vi.mocked(db.getAllSolves).mockResolvedValue(mockSolves);

    /* syncSolveData mock */
    vi.mocked(syncSolveData).mockResolvedValue(0);
  });

  afterEach(() => {
    // Always clean up env vars even if test fails
    vi.unstubAllEnvs();
  });

  it('handles missing username path', async () => {
    vi.mocked(db.getUsername).mockResolvedValue(undefined);
    const res = await initApp();
    expect(res).toEqual({
      username: undefined,
      errors: [],
    });
  });

  it('successfully initializes for valid user', async () => {
    const res = await initApp();
    expect(res.username).toBe('user');
    expect(res.errors).toEqual([]);
    expect(syncSolveData).toHaveBeenCalledWith('user');
  });

  it('throws error when extension unavailable', async () => {
    const err: any = new Error('Extension unavailable');
    err.code = 'EXTENSION_UNAVAILABLE';
    vi.mocked(syncSolveData).mockRejectedValue(err);

    await expect(initApp()).rejects.toThrow('Extension not available');
  });

  it('handles unexpected sync errors', async () => {
    vi.mocked(syncSolveData).mockRejectedValue(new Error('Unexpected error'));
    const res = await initApp();
    expect(res.errors).toContain('An unexpected error occurred while loading solve data.');
  });

  it('loads demo data for demo user', async () => {
    vi.stubEnv('VITE_DEMO_USERNAME', 'test-demo-user');
    vi.mocked(db.getUsername).mockResolvedValue('test-demo-user');
    vi.mocked(syncSolveData).mockResolvedValue(5);

    const res = await initApp();
    expect(res.username).toBe('test-demo-user');
    expect(res.errors).toEqual([]);
    expect(syncSolveData).toHaveBeenCalledWith('test-demo-user');
  });
});
