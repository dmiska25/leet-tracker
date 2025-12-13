import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncSolveData } from './syncSolveData';
import { db } from '@/storage/db';
import { syncFromExtension } from './extensionSync';
import { syncDemoSolves } from '@/api/demo';

vi.mock('@/storage/db');
vi.mock('./extensionSync');
vi.mock('@/api/demo');

describe('syncSolveData', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it('calls syncDemoSolves for demo user', async () => {
    vi.stubEnv('VITE_DEMO_USERNAME', 'demo-user');
    vi.mocked(syncDemoSolves).mockResolvedValue(5);

    const result = await syncSolveData('demo-user');

    expect(result).toBe(5);
    expect(syncDemoSolves).toHaveBeenCalledWith(db);
    expect(syncFromExtension).not.toHaveBeenCalled();
  });

  it('calls syncFromExtension for regular user', async () => {
    vi.stubEnv('VITE_DEMO_USERNAME', 'demo-user');
    vi.mocked(syncFromExtension).mockResolvedValue(10);

    const result = await syncSolveData('regular-user');

    expect(result).toBe(10);
    expect(syncFromExtension).toHaveBeenCalledWith('regular-user');
    expect(syncDemoSolves).not.toHaveBeenCalled();
  });

  it('returns count from syncDemoSolves', async () => {
    vi.stubEnv('VITE_DEMO_USERNAME', 'test-demo');
    vi.mocked(syncDemoSolves).mockResolvedValue(3);

    const result = await syncSolveData('test-demo');

    expect(result).toBe(3);
  });

  it('returns count from syncFromExtension', async () => {
    vi.mocked(syncFromExtension).mockResolvedValue(7);

    const result = await syncSolveData('alice');

    expect(result).toBe(7);
  });

  it('throws error when extension unavailable', async () => {
    const error: any = new Error('Extension unavailable');
    error.code = 'EXTENSION_UNAVAILABLE';
    vi.mocked(syncFromExtension).mockRejectedValue(error);

    await expect(syncSolveData('bob')).rejects.toThrow('Extension unavailable');
  });

  it('throws error when demo sync fails', async () => {
    vi.stubEnv('VITE_DEMO_USERNAME', 'demo-user');
    vi.mocked(syncDemoSolves).mockRejectedValue(new Error('Demo data not found'));

    await expect(syncSolveData('demo-user')).rejects.toThrow('Demo data not found');
  });

  it('handles undefined DEMO_USERNAME env var', async () => {
    // When VITE_DEMO_USERNAME is not set, any user should use extension
    vi.mocked(syncFromExtension).mockResolvedValue(2);

    const result = await syncSolveData('any-user');

    expect(result).toBe(2);
    expect(syncFromExtension).toHaveBeenCalledWith('any-user');
    expect(syncDemoSolves).not.toHaveBeenCalled();
  });

  it('is case-sensitive for demo username matching', async () => {
    vi.stubEnv('VITE_DEMO_USERNAME', 'Demo-User');
    vi.mocked(syncFromExtension).mockResolvedValue(1);

    // Different case should use extension
    const result = await syncSolveData('demo-user');

    expect(result).toBe(1);
    expect(syncFromExtension).toHaveBeenCalledWith('demo-user');
    expect(syncDemoSolves).not.toHaveBeenCalled();
  });

  it('can be called multiple times with different users', async () => {
    vi.stubEnv('VITE_DEMO_USERNAME', 'demo');
    vi.mocked(syncDemoSolves).mockResolvedValue(2);
    vi.mocked(syncFromExtension).mockResolvedValue(5);

    const result1 = await syncSolveData('demo');
    expect(result1).toBe(2);
    expect(syncDemoSolves).toHaveBeenCalledTimes(1);

    const result2 = await syncSolveData('alice');
    expect(result2).toBe(5);
    expect(syncFromExtension).toHaveBeenCalledTimes(1);

    const result3 = await syncSolveData('bob');
    expect(result3).toBe(5);
    expect(syncFromExtension).toHaveBeenCalledTimes(2);
  });
});
