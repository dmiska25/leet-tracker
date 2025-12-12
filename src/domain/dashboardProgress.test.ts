import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeDashboardProgress } from './dashboardProgress';
import { db } from '@/storage/db';
import { evaluateCategoryProgress } from './progress';
import { clearCache, primeData, setSolves } from './recommendations';
import type { GoalProfile, Solve, Difficulty } from '@/types/types';

vi.mock('@/storage/db');
vi.mock('./progress');
vi.mock('./recommendations');

describe('computeDashboardProgress', () => {
  const mockProfile: GoalProfile = {
    id: 'test-profile',
    name: 'Test Profile',
    description: 'Test',
    goals: {
      Array: 0.6,
      'Hash Table': 0.5,
      'Linked List': 0.4,
    },
    createdAt: '',
    isEditable: true,
  };

  const mockSolves: Solve[] = [
    {
      slug: 'two-sum',
      title: 'Two Sum',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'ts',
      difficulty: 'Easy' as Difficulty,
      tags: ['Array', 'Hash Table'],
    },
    {
      slug: 'reverse-linked-list',
      title: 'Reverse Linked List',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'ts',
      difficulty: 'Easy' as Difficulty,
      tags: ['Linked List'],
    },
    {
      slug: 'add-two-numbers',
      title: 'Add Two Numbers',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'ts',
      difficulty: 'Medium' as Difficulty,
      tags: ['Linked List', 'Math'],
    },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.getAllSolves).mockResolvedValue(mockSolves);
    vi.mocked(evaluateCategoryProgress).mockReturnValue({
      estimatedScore: 0.5,
      confidenceLevel: 0.8,
      adjustedScore: 0.4,
    });
    vi.mocked(clearCache).mockImplementation(() => {});
    vi.mocked(setSolves).mockResolvedValue(undefined);
    vi.mocked(primeData).mockResolvedValue(undefined);
  });

  it('fetches solves from database', async () => {
    await computeDashboardProgress(mockProfile);

    expect(db.getAllSolves).toHaveBeenCalledTimes(1);
  });

  it('clears recommendations cache before computing', async () => {
    await computeDashboardProgress(mockProfile);

    expect(clearCache).toHaveBeenCalledTimes(1);
  });

  it('updates recommendations with current solves', async () => {
    await computeDashboardProgress(mockProfile);

    expect(setSolves).toHaveBeenCalledWith(mockSolves);
  });

  it('primes recommendations data', async () => {
    await computeDashboardProgress(mockProfile);

    expect(primeData).toHaveBeenCalledTimes(1);
  });

  it('computes progress for each category in profile', async () => {
    const result = await computeDashboardProgress(mockProfile);

    expect(result).toHaveLength(3);
    expect(result.map((p) => p.tag)).toEqual(['Array', 'Hash Table', 'Linked List']);
  });

  it('includes goal for each category', async () => {
    const result = await computeDashboardProgress(mockProfile);

    expect(result[0].goal).toBe(0.6); // Array
    expect(result[1].goal).toBe(0.5); // Hash Table
    expect(result[2].goal).toBe(0.4); // Linked List
  });

  it('filters solves by category tag', async () => {
    await computeDashboardProgress(mockProfile);

    // evaluateCategoryProgress should be called 3 times (once per category)
    expect(evaluateCategoryProgress).toHaveBeenCalledTimes(3);

    // Check first call (Array)
    const arrayCall = vi.mocked(evaluateCategoryProgress).mock.calls[0][0];
    expect(arrayCall).toHaveLength(1); // Only "two-sum" has Array tag
    expect(arrayCall[0].slug).toBe('two-sum');

    // Check second call (Hash Table)
    const hashTableCall = vi.mocked(evaluateCategoryProgress).mock.calls[1][0];
    expect(hashTableCall).toHaveLength(1); // Only "two-sum" has Hash Table tag
    expect(hashTableCall[0].slug).toBe('two-sum');

    // Check third call (Linked List)
    const linkedListCall = vi.mocked(evaluateCategoryProgress).mock.calls[2][0];
    expect(linkedListCall).toHaveLength(2); // Both linked list problems
    expect(linkedListCall.map((s) => s.slug)).toEqual(['reverse-linked-list', 'add-two-numbers']);
  });

  it('includes scores from evaluateCategoryProgress', async () => {
    vi.mocked(evaluateCategoryProgress).mockReturnValueOnce({
      estimatedScore: 0.7,
      confidenceLevel: 0.9,
      adjustedScore: 0.63,
    });

    const result = await computeDashboardProgress(mockProfile);

    expect(result[0].estimatedScore).toBe(0.7);
    expect(result[0].confidenceLevel).toBe(0.9);
    expect(result[0].adjustedScore).toBe(0.63);
  });

  it('handles empty solve list', async () => {
    vi.mocked(db.getAllSolves).mockResolvedValue([]);

    const result = await computeDashboardProgress(mockProfile);

    expect(result).toHaveLength(3);
    // Should still call evaluateCategoryProgress with empty arrays
    expect(evaluateCategoryProgress).toHaveBeenCalledTimes(3);
  });

  it('handles profile with no categories', async () => {
    const emptyProfile: GoalProfile = {
      ...mockProfile,
      goals: {},
    };

    const result = await computeDashboardProgress(emptyProfile);

    expect(result).toHaveLength(0);
    expect(evaluateCategoryProgress).not.toHaveBeenCalled();
  });

  it('handles solves without tags', async () => {
    const solvesWithoutTags: Solve[] = [
      {
        slug: 'no-tags',
        title: 'No Tags',
        timestamp: Date.now() / 1000,
        status: 'Accepted',
        lang: 'ts',
        difficulty: 'Easy' as Difficulty,
        tags: undefined,
      },
    ];
    vi.mocked(db.getAllSolves).mockResolvedValue(solvesWithoutTags);

    const result = await computeDashboardProgress(mockProfile);

    // Should not crash, all categories should get empty arrays
    expect(result).toHaveLength(3);
    expect(evaluateCategoryProgress).toHaveBeenCalledTimes(3);
    // All calls should have empty arrays
    vi.mocked(evaluateCategoryProgress).mock.calls.forEach((call) => {
      expect(call[0]).toHaveLength(0);
    });
  });

  it('returns different scores for different categories', async () => {
    vi.mocked(evaluateCategoryProgress)
      .mockReturnValueOnce({
        estimatedScore: 0.8,
        confidenceLevel: 0.9,
        adjustedScore: 0.72,
      })
      .mockReturnValueOnce({
        estimatedScore: 0.3,
        confidenceLevel: 0.5,
        adjustedScore: 0.15,
      })
      .mockReturnValueOnce({
        estimatedScore: 0.6,
        confidenceLevel: 0.7,
        adjustedScore: 0.42,
      });

    const result = await computeDashboardProgress(mockProfile);

    expect(result[0].adjustedScore).toBe(0.72);
    expect(result[1].adjustedScore).toBe(0.15);
    expect(result[2].adjustedScore).toBe(0.42);
  });

  it('handles database errors', async () => {
    vi.mocked(db.getAllSolves).mockRejectedValue(new Error('DB error'));

    await expect(computeDashboardProgress(mockProfile)).rejects.toThrow('DB error');
  });

  it('handles evaluateCategoryProgress errors', async () => {
    vi.mocked(evaluateCategoryProgress).mockImplementation(() => {
      throw new Error('Evaluation error');
    });

    await expect(computeDashboardProgress(mockProfile)).rejects.toThrow('Evaluation error');
  });
});
