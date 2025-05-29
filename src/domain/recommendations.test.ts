import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCategorySuggestions, primeData, clearCache } from './recommendations';
import { db } from '../storage/db';
import { Difficulty, Problem, Solve } from '../types/types';

vi.mock('../storage/db');

const problems: Problem[] = [
  {
    slug: 'fundamental-1',
    title: 'Fundamental 1',
    tags: ['Array'],
    description: '',
    difficulty: Difficulty.Easy,
    isPaid: false,
    popularity: 0.9,
    isFundamental: true,
    createdAt: 0,
  },
  {
    slug: 'unsolved-new',
    title: 'Unsolved New',
    tags: ['Array'],
    description: '',
    difficulty: Difficulty.Medium,
    isPaid: false,
    popularity: 0.6,
    isFundamental: false,
    createdAt: 0,
  },
  {
    slug: 'needs-refresh',
    title: 'Needs Refresh',
    tags: ['Array'],
    description: '',
    difficulty: Difficulty.Easy,
    isPaid: false,
    popularity: 0.5,
    isFundamental: false,
    createdAt: 0,
  },
  {
    slug: 'paid-problem', // Should be ignored
    title: 'Paid Problem',
    tags: ['Array'],
    description: '',
    difficulty: Difficulty.Hard,
    isPaid: true,
    popularity: 0.8,
    isFundamental: false,
    createdAt: 0,
  },
  {
    slug: 'no-category-problem',
    title: 'No Category Problem',
    tags: [], // No categories, should be ignored
    description: '',
    difficulty: Difficulty.Medium,
    isPaid: false,
    popularity: 0.4,
    isFundamental: false,
    createdAt: 0,
  },
];

const now = Math.floor(Date.now() / 1000);
const solves: Solve[] = [
  // Low‑quality recent solve → should land in refresh bucket
  {
    slug: 'needs-refresh',
    title: 'Needs Refresh',
    timestamp: now - 5 * 86_400,
    status: 'Accepted',
    lang: 'ts',
    difficulty: Difficulty.Easy,
    tags: ['Array'],
    qualityScore: 0.4,
  },
];

describe('recommendation engine', () => {
  beforeEach(async () => {
    clearCache();
    vi.mocked(db.getAllProblems).mockResolvedValue(problems);
    vi.mocked(db.getAllSolves).mockResolvedValue(solves);
    vi.spyOn(Math, 'random').mockReturnValue(0.11); // deterministic sample
    await primeData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bucket classification works (fundamental / new / refresh)', async () => {
    const res = await getCategorySuggestions('Array', 5);

    // Fundamental problem must appear only in fundamentals
    expect(res.fundamentals.find((p) => p.slug === 'fundamental-1')).toBeTruthy();
    expect(res.refresh.find((p) => p.slug === 'fundamental-1')).toBeFalsy();
    expect(res.new.find((p) => p.slug === 'fundamental-1')).toBeFalsy();

    // Unsolved non‑fundamental goes to new
    expect(res.new.find((p) => p.slug === 'unsolved-new')).toBeTruthy();

    // Low‑quality recent solve → should land in refresh bucket and expose lastSolved
    const refreshItem = res.refresh.find((p) => p.slug === 'needs-refresh');
    expect(refreshItem).toBeTruthy();
    expect(refreshItem?.lastSolved).toBeDefined();
    expect(typeof refreshItem!.lastSolved).toBe('number');
  });

  it('returns empty buckets when category has no problems', async () => {
    const res = await getCategorySuggestions('Tree', 3);
    expect(res.fundamentals.length).toBe(0);
    expect(res.refresh.length).toBe(0);
    expect(res.new.length).toBe(0);
  });

  it('filters out paid problems', async () => {
    const res = await getCategorySuggestions('Array', 5);

    // Ensure the paid problem is not included in any bucket
    expect(res.fundamentals.find((p) => p.slug === 'paid-problem')).toBeFalsy();
    expect(res.refresh.find((p) => p.slug === 'paid-problem')).toBeFalsy();
    expect(res.new.find((p) => p.slug === 'paid-problem')).toBeFalsy();
  });

  it('handles problems with no categories gracefully', async () => {
    const res = await getCategorySuggestions('Array', 5);

    // Ensure the problem with no categories is not included in any bucket
    expect(res.fundamentals.find((p) => p.slug === 'no-category-problem')).toBeFalsy();
    expect(res.refresh.find((p) => p.slug === 'no-category-problem')).toBeFalsy();
    expect(res.new.find((p) => p.slug === 'no-category-problem')).toBeFalsy();
  });
});
