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
    const tags = new Set(result.map((p) => p.tag));
    expect(tags).toEqual(new Set(['Array', 'Hash Table', 'Linked List']));
  });

  it('includes goal for each category', async () => {
    const result = await computeDashboardProgress(mockProfile);

    const progressByTag = new Map(result.map((p) => [p.tag, p]));
    expect(progressByTag.get('Array')?.goal).toBe(0.6);
    expect(progressByTag.get('Hash Table')?.goal).toBe(0.5);
    expect(progressByTag.get('Linked List')?.goal).toBe(0.4);
  });

  it('filters solves by category tag', async () => {
    await computeDashboardProgress(mockProfile);

    // evaluateCategoryProgress should be called 3 times (once per category)
    expect(evaluateCategoryProgress).toHaveBeenCalledTimes(3);

    // Build a map of category -> solves slugs from all calls
    const callsByCategory = new Map<string, string[]>();
    for (const call of vi.mocked(evaluateCategoryProgress).mock.calls) {
      const solves = call[0];
      const tags = solves[0]?.tags || [];
      for (const tag of tags) {
        if (mockProfile.goals[tag] !== undefined) {
          callsByCategory.set(
            tag,
            solves.map((s) => s.slug),
          );
        }
      }
    }

    // Check that Array category got the right solve
    expect(callsByCategory.get('Array')).toHaveLength(1);
    expect(callsByCategory.get('Array')?.[0]).toBe('two-sum');

    // Check that Hash Table category got the right solve
    expect(callsByCategory.get('Hash Table')).toHaveLength(1);
    expect(callsByCategory.get('Hash Table')?.[0]).toBe('two-sum');

    // Check that Linked List category got both solves
    const linkedListSlugs = new Set(callsByCategory.get('Linked List'));
    expect(linkedListSlugs).toEqual(new Set(['reverse-linked-list', 'add-two-numbers']));
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
    // Set up distinct scores for each mock call
    const mockScores = [
      { estimatedScore: 0.8, confidenceLevel: 0.9, adjustedScore: 0.72 },
      { estimatedScore: 0.3, confidenceLevel: 0.5, adjustedScore: 0.15 },
      { estimatedScore: 0.6, confidenceLevel: 0.7, adjustedScore: 0.42 },
    ];

    vi.mocked(evaluateCategoryProgress)
      .mockReturnValueOnce(mockScores[0])
      .mockReturnValueOnce(mockScores[1])
      .mockReturnValueOnce(mockScores[2]);

    const result = await computeDashboardProgress(mockProfile);

    // Verify all three scores appear in the results (order-independent)
    const adjustedScores = new Set(result.map((p) => p.adjustedScore));
    expect(adjustedScores).toEqual(new Set([0.72, 0.15, 0.42]));
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
