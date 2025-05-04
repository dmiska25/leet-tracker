import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { fetchProblemCatalog, fetchRecentSolves } from '../api/leetcode';
import { Difficulty, Problem, Solve } from '../types/types';
import { initApp } from './initApp';

// Mock the external dependencies
vi.mock('../storage/db');
vi.mock('../api/leetcode');

// Sample test data
const mockProblems: Problem[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    tags: ['Array', 'Hash Table'],
    description: 'Sample description',
    difficulty: Difficulty.Easy,
    popularity: 59.191,
    isFundamental: true,
    createdAt: 1746308137,
  },
];

const mockSolves: Solve[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    timestamp: 1746308137,
    status: 'Accepted',
    lang: 'typescript',
  },
];

describe('initApp', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Add console.error spy
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Setup default mock implementations
    vi.mocked(db.getUsername).mockResolvedValue('testuser');
    vi.mocked(db.getProblemListLastUpdated).mockResolvedValue(undefined);
    vi.mocked(db.getSolve).mockResolvedValue(undefined);
    vi.mocked(fetchProblemCatalog).mockResolvedValue(mockProblems);
    vi.mocked(fetchRecentSolves).mockResolvedValue(mockSolves);
    vi.mocked(db.withTransaction).mockImplementation(async (_, callback) => {
      const mockTx = {
        objectStore: () => ({
          put: vi.fn().mockResolvedValue(undefined),
        }),
      };
      return callback(mockTx as any);
    });
  });

  it('should return undefined values when no username is found', async () => {
    vi.mocked(db.getUsername).mockResolvedValue(undefined);
    const result = await initApp();
    expect(result).toEqual({
      username: undefined,
      additionalData: undefined,
    });
  });

  it('should fetch and store problems when catalog is stale', async () => {
    const result = await initApp();

    expect(fetchProblemCatalog).toHaveBeenCalled();
    expect(db.withTransaction).toHaveBeenCalledWith(
      ['problem-list', 'problem-metadata'],
      expect.any(Function),
    );
    expect(result).toEqual({
      username: 'testuser',
      additionalData: true,
    });
  });

  it('should not fetch problems when catalog is fresh', async () => {
    // Set last updated to current time
    vi.mocked(db.getProblemListLastUpdated).mockResolvedValue(Date.now());

    const result = await initApp();

    expect(fetchProblemCatalog).not.toHaveBeenCalled();
    expect(result).toEqual({
      username: 'testuser',
      additionalData: true,
    });
  });

  it('should set additionalData to false when first solve exists in db', async () => {
    vi.mocked(db.getSolve).mockResolvedValue(mockSolves[0]);

    const result = await initApp();

    expect(result.additionalData).toBe(false);
    expect(db.getSolve).toHaveBeenCalledWith(mockSolves[0].slug, mockSolves[0].timestamp);
  });

  it('should set additionalData to true when first solve is not in db', async () => {
    vi.mocked(db.getSolve).mockResolvedValue(undefined);

    const result = await initApp();

    expect(result.additionalData).toBe(true);
    expect(db.getSolve).toHaveBeenCalledWith(mockSolves[0].slug, mockSolves[0].timestamp);
  });

  it('should sync recent solves using transaction', async () => {
    const result = await initApp();

    expect(fetchRecentSolves).toHaveBeenCalledWith('testuser');
    expect(db.withTransaction).toHaveBeenCalledWith(['solves'], expect.any(Function));
    expect(result.username).toBe('testuser');
  });

  it('should handle errors during problem fetch', async () => {
    const error = new Error('API error');
    vi.mocked(fetchProblemCatalog).mockRejectedValue(error);

    const result = await initApp();

    expect(result.username).toBe('testuser');
    expect(console.error).toHaveBeenCalledWith('[initApp] Failed to fetch problem catalog:', error);
  });

  it('should handle errors during solves sync', async () => {
    const error = new Error('API error');
    vi.mocked(fetchRecentSolves).mockRejectedValue(error);

    const result = await initApp();

    expect(result.username).toBe('testuser');
    expect(console.error).toHaveBeenCalledWith('[initApp] Failed to sync recent solves:', error);
  });
});
