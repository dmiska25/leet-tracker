import { describe, it, expect } from 'vitest';
import { evaluateCategoryProgress } from './progress';
import { Difficulty, Solve } from '../types/types';

const now = Math.floor(Date.now() / 1000);
const makeSolve = (
  slug: string,
  status: string,
  diff: Difficulty,
  daysAgo: number,
  quality?: number,
): Solve => ({
  slug,
  title: slug,
  timestamp: now - daysAgo * 86_400,
  status,
  lang: 'ts',
  difficulty: diff,
  tags: ['Array'],
  qualityScore: quality,
});

describe('evaluateCategoryProgress', () => {
  it('returns zeros for empty solve list', () => {
    expect(evaluateCategoryProgress([])).toEqual({
      estimatedScore: 0,
      confidenceLevel: 0,
      adjustedScore: 0,
    });
  });

  it('weights Hard difficulty higher than Easy (same recency)', () => {
    const easy = [makeSolve('easy', 'Accepted', Difficulty.Easy, 1)];
    const hard = [makeSolve('hard', 'Accepted', Difficulty.Hard, 1)];
    const easyScore = evaluateCategoryProgress(easy).estimatedScore;
    const hardScore = evaluateCategoryProgress(hard).estimatedScore;
    expect(hardScore).toBeGreaterThan(easyScore);
  });

  it('penalises multiple failed attempts on same day', () => {
    const singleAttempt = [makeSolve('x', 'Accepted', Difficulty.Easy, 1)];
    const twoAttempts = [
      makeSolve('x', 'Rejected', Difficulty.Easy, 1, 0),
      makeSolve('x', 'Accepted', Difficulty.Easy, 1),
    ];
    const singleScore = evaluateCategoryProgress(singleAttempt).adjustedScore;
    const multiScore = evaluateCategoryProgress(twoAttempts).adjustedScore;
    expect(multiScore).toBeLessThan(singleScore);
  });

  it('applies recency decay (fresh > stale)', () => {
    const fresh = [makeSolve('fresh', 'Accepted', Difficulty.Easy, 2)];
    const stale = [makeSolve('stale', 'Accepted', Difficulty.Easy, 85)];
    expect(evaluateCategoryProgress(fresh).adjustedScore).toBeGreaterThan(
      evaluateCategoryProgress(stale).adjustedScore,
    );
  });
});
