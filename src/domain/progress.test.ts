import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { evaluateCategoryProgress } from './progress';
import { Difficulty, Solve } from '../types/types';

// Fixed timestamp for consistent test results
const FIXED_NOW_MS = 1692360000000; // August 18, 2023 12:00:00 GMT
const now = Math.floor(FIXED_NOW_MS / 1000);
const makeSolve = (
  slug: string,
  status: string,
  diff: Difficulty,
  daysAgo: number,
  feedbackScore?: number,
): Solve => {
  const solve: Solve = {
    slug,
    title: slug,
    timestamp: now - daysAgo * 86_400,
    status,
    lang: 'ts',
    difficulty: diff,
    tags: ['Array'],
  };

  if (feedbackScore !== undefined) {
    solve.feedback = {
      performance: {
        time_to_solve: 5,
        time_complexity: 'O(n)',
        space_complexity: 'O(1)',
        comments: '',
      },
      code_quality: {
        readability: 5,
        correctness: 5,
        maintainability: 5,
        comments: '',
      },
      summary: {
        final_score: feedbackScore,
        comments: '',
      },
    };
  }
  return solve;
};

describe('evaluateCategoryProgress', () => {
  beforeAll(() => {
    // Mock Date.now to return a fixed timestamp for consistent test results
    vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

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

  it('penalizes multiple failed attempts on same day', () => {
    const single = [makeSolve('x', 'Accepted', Difficulty.Hard, 1)];
    const failedFirst = [
      makeSolve('x', 'Rejected', Difficulty.Hard, 1),
      makeSolve('x', 'Accepted', Difficulty.Hard, 1),
    ];
    const scoreSingle = evaluateCategoryProgress(single).adjustedScore;
    const scoreFailed = evaluateCategoryProgress(failedFirst).adjustedScore;
    expect(scoreFailed).toBeLessThan(scoreSingle);
  });

  it('applies recency decay (fresh > stale)', () => {
    const fresh = [makeSolve('fresh', 'Accepted', Difficulty.Easy, 2)];
    const stale = [makeSolve('stale', 'Accepted', Difficulty.Easy, 85)];
    expect(evaluateCategoryProgress(fresh).adjustedScore).toBeGreaterThan(
      evaluateCategoryProgress(stale).adjustedScore,
    );
  });

  it('caps adjusted score at 1.0', () => {
    const solves = Array.from({ length: 30 }, (_, i) =>
      makeSolve(`h${i}`, 'Accepted', Difficulty.Hard, i % 14),
    );
    const score = evaluateCategoryProgress(solves).adjustedScore;
    expect(score).toBeLessThanOrEqual(1);
  });

  it('only includes the most recent accepted solve on the same day', () => {
    const timestampMorning = now - 1 * 86_400 + 3600; // morning of yesterday
    const timestampEvening = now - 1 * 86_400 + 7200; // evening of yesterday

    const earlierSolve = {
      ...makeSolve('same-day', 'Accepted', Difficulty.Medium, 1),
      timestamp: timestampMorning,
    };

    const laterSolve = {
      ...makeSolve('same-day', 'Accepted', Difficulty.Medium, 1),
      timestamp: timestampEvening,
    };

    const result = evaluateCategoryProgress([earlierSolve, laterSolve]);
    const baseline = evaluateCategoryProgress([laterSolve]).estimatedScore;
    expect(result.estimatedScore).toBeCloseTo(baseline, 3);
  });

  it('ignores groups that have no accepted solve', () => {
    const solved = [makeSolve('solved', 'Accepted', Difficulty.Medium, 1)];

    const withUnsolved = [...solved, makeSolve('unsolved', 'Rejected', Difficulty.Medium, 1)];

    const resultWithout = evaluateCategoryProgress(solved);
    const resultWith = evaluateCategoryProgress(withUnsolved);

    expect(resultWith.adjustedScore).toBeCloseTo(resultWithout.adjustedScore, 2);
    expect(resultWith.confidenceLevel).toBeCloseTo(resultWithout.confidenceLevel, 2);
  });

  it('higher volume increases confidence (until capped)', () => {
    const few = Array.from({ length: 5 }, (_, i) =>
      makeSolve(`m${i}`, 'Accepted', Difficulty.Medium, i),
    );
    const many = Array.from({ length: 20 }, (_, i) =>
      makeSolve(`m${i}`, 'Accepted', Difficulty.Medium, i),
    );
    expect(evaluateCategoryProgress(many).confidenceLevel).toBeGreaterThan(
      evaluateCategoryProgress(few).confidenceLevel,
    );
  });

  it('mixed difficulty leads to higher estimated score than medium-only', () => {
    const medium = Array.from({ length: 10 }, (_, i) =>
      makeSolve(`m${i}`, 'Accepted', Difficulty.Medium, i),
    );
    const mixed = [
      ...medium,
      ...Array.from({ length: 10 }, (_, i) => makeSolve(`h${i}`, 'Accepted', Difficulty.Hard, i)),
    ];
    const mScore = evaluateCategoryProgress(medium).estimatedScore;
    const mixScore = evaluateCategoryProgress(mixed).estimatedScore;
    expect(mixScore).toBeGreaterThan(mScore);
  });

  it('older solves reduce confidence but not estimated score', () => {
    const fresh = Array.from({ length: 20 }, (_, i) =>
      makeSolve(`m${i}`, 'Accepted', Difficulty.Medium, i),
    );
    const stale = Array.from({ length: 20 }, (_, i) =>
      makeSolve(`m${i}`, 'Accepted', Difficulty.Medium, 70 + i),
    );
    const freshEval = evaluateCategoryProgress(fresh);
    const staleEval = evaluateCategoryProgress(stale);
    expect(freshEval.estimatedScore).toBeCloseTo(staleEval.estimatedScore, 2);
    expect(freshEval.confidenceLevel).toBeGreaterThan(staleEval.confidenceLevel);
  });

  it('older solves do not reduce score when combined with recent ones', () => {
    const recent = Array.from({ length: 10 }, (_, i) =>
      makeSolve(`recent-${i}`, 'Accepted', Difficulty.Medium, i),
    );

    const old = Array.from({ length: 10 }, (_, i) =>
      makeSolve(`old-${i}`, 'Accepted', Difficulty.Medium, 85 - i),
    );

    const withOld = evaluateCategoryProgress([...recent, ...old]);
    const withoutOld = evaluateCategoryProgress(recent);

    expect(withOld.adjustedScore).toBeGreaterThanOrEqual(withoutOld.adjustedScore);
  });

  it('solves older than 90 days contribute nothing to score or confidence', () => {
    const old = Array.from({ length: 10 }, (_, i) =>
      makeSolve(`very-old-${i}`, 'Accepted', Difficulty.Medium, 100 + i),
    );

    const result = evaluateCategoryProgress(old);

    expect(result.estimatedScore).toBe(0);
    expect(result.confidenceLevel).toBe(0);
    expect(result.adjustedScore).toBe(0);
  });

  it('uses feedback final_score (normalized)', () => {
    // Default quality (0.8), Feedback 100 (1.0)
    const solveWithFeedback = makeSolve('feedback-solve', 'Accepted', Difficulty.Medium, 1, 100);
    const solveWithoutFeedback = makeSolve('no-feedback-solve', 'Accepted', Difficulty.Medium, 1);

    // With feedback 100 (=1.0), score should be higher than with default 0.8
    const scoreWith = evaluateCategoryProgress([solveWithFeedback]).adjustedScore;
    const scoreWithout = evaluateCategoryProgress([solveWithoutFeedback]).adjustedScore;

    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });

  it('uses feedback final_score over default', () => {
    // Default (0.8), Feedback 20 (0.2)
    const solveWithFeedback = makeSolve('feedback-solve-2', 'Accepted', Difficulty.Medium, 1, 20);
    const solveDefault = makeSolve('default-solve', 'Accepted', Difficulty.Medium, 1);

    // With feedback 0.2, score should be lower than default 0.8
    const scoreWith = evaluateCategoryProgress([solveWithFeedback]).adjustedScore;
    const scoreDefault = evaluateCategoryProgress([solveDefault]).adjustedScore;

    expect(scoreWith).toBeLessThan(scoreDefault);
  });
});
