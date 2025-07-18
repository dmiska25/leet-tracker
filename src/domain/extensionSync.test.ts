import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { getManifestSince, getChunk, ExtensionUnavailable } from '../api/extensionBridge';
import { syncFromExtension } from './extensionSync';
import { Difficulty, Problem, Solve } from '../types/types';

vi.mock('../storage/db');
vi.mock('../api/extensionBridge');

const mockProblems: Problem[] = [
  {
    slug: 'p1',
    title: 'Problem 1',
    tags: ['Array'],
    description: 'Description 1',
    difficulty: Difficulty.Easy,
    popularity: 0.8,
    isPaid: false,
    isFundamental: true,
    createdAt: 0,
  },
];

const mockSolves = [
  {
    titleSlug: 'p1',
    timestamp: 1234567890,
    statusDisplay: 'Accepted',
    lang: 'ts',
    solveTime: 120,
    codeDetail: { code: 'console.log("solution");' },
    problemDescription: 'Updated description',
  },
];

describe('syncFromExtension', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    /* db mocks */
    vi.mocked(db.getExtensionLastTimestamp).mockResolvedValue(0);
    vi.mocked(db.getProblem).mockResolvedValue(mockProblems[0]);
    vi.mocked(db.getSolve).mockResolvedValue(undefined);
    vi.mocked(db.addOrUpdateProblem).mockResolvedValue('');
    vi.mocked(db.saveSolve).mockResolvedValue('');
    vi.mocked(db.setExtensionLastTimestamp).mockResolvedValue('');

    /* extensionBridge mocks */
    vi.mocked(getManifestSince).mockResolvedValue([{ index: 0, from: 0, to: 1234567890 }]);
    vi.mocked(getChunk).mockResolvedValue(mockSolves);
  });

  it('syncs new solves and updates problems', async () => {
    const added = await syncFromExtension('testuser');

    expect(added).toBe(1); // One solve added
    expect(db.getExtensionLastTimestamp).toHaveBeenCalled();
    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).toHaveBeenCalledWith('testuser', 0);
    expect(db.addOrUpdateProblem).toHaveBeenCalledWith({
      ...mockProblems[0],
      description: 'Updated description',
    });
    expect(db.saveSolve).toHaveBeenCalledWith({
      slug: 'p1',
      title: 'p1',
      timestamp: 1234567890,
      status: 'Accepted',
      lang: 'ts',
      timeUsed: 120,
      code: 'console.log("solution");',
      difficulty: Difficulty.Easy,
      tags: ['Array'],
    });
    expect(db.setExtensionLastTimestamp).toHaveBeenCalledWith(1234567890);
  });

  it('handles no new solves gracefully', async () => {
    vi.mocked(getManifestSince).mockResolvedValue([]); // No new chunks

    const added = await syncFromExtension('testuser');

    expect(added).toBe(0);
    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).not.toHaveBeenCalled();
    expect(db.saveSolve).not.toHaveBeenCalled();
  });

  it('throws ExtensionUnavailable error when extension is unavailable', async () => {
    vi.mocked(getManifestSince).mockRejectedValue(new ExtensionUnavailable());

    await expect(syncFromExtension('testuser')).rejects.toThrow(ExtensionUnavailable);

    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).not.toHaveBeenCalled();
    expect(db.saveSolve).not.toHaveBeenCalled();
  });

  it('handles unexpected errors during sync', async () => {
    vi.mocked(getManifestSince).mockRejectedValue(new Error('Unexpected error'));

    await expect(syncFromExtension('testuser')).rejects.toThrow('Unexpected error');

    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).not.toHaveBeenCalled();
    expect(db.saveSolve).not.toHaveBeenCalled();
  });

  it('preserves existing timeUsed, code, and tags', async () => {
    const existingSolve: Solve = {
      slug: 'p1',
      title: 'Problem 1',
      timestamp: 1234567890,
      status: 'Accepted',
      lang: 'ts',
      timeUsed: 300, // Existing timeUsed
      code: 'console.log("existing solution");', // Existing code
      difficulty: Difficulty.Easy,
      tags: ['Greedy'], // Existing tags
    };

    vi.mocked(db.getSolve).mockResolvedValue(existingSolve);

    const added = await syncFromExtension('testuser');

    expect(added).toBe(1); // One solve added
    expect(db.saveSolve).toHaveBeenCalledWith({
      slug: 'p1',
      title: 'p1',
      timestamp: 1234567890,
      status: 'Accepted',
      lang: 'ts',
      timeUsed: 300, // Preserved timeUsed
      code: 'console.log("existing solution");', // Preserved code
      difficulty: Difficulty.Easy,
      tags: ['Greedy'], // Preserved tags
    });
  });
});
