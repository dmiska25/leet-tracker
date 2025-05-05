import { db } from '../storage/db';
import { Problem, Solve, Category } from '../types/types';
import { CategoryRecommendation, ProblemLite } from '../types/recommendation';

const DEFAULT_QUALITY_SCORE = 0.8;

let _problems: Problem[] = [];
let _solves: Solve[] = [];

let primeDataPromise: Promise<void> | null = null;

/**
 * Ensures that problem and solve data is loaded into memory.
 * Prevents simultaneous calls by using a shared promise.
 */
export async function primeData(): Promise<void> {
  if (primeDataPromise) {
    // If already running, wait for the existing promise
    await primeDataPromise;
    return;
  }

  // Create a shared promise
  primeDataPromise = (async () => {
    const problemsPromise = db.getAllProblems();
    const solvesPromise = db.getAllSolves();

    if (_problems.length === 0) _problems = await problemsPromise;
    if (_solves.length === 0) _solves = await solvesPromise;

    // Clear the shared promise once complete
    primeDataPromise = null;
  })();

  await primeDataPromise;
}

/**
 * Updates the solve data cache.
 */
export async function setSolves(solves: Solve[]): Promise<void> {
  _solves = solves;
}

/**
 * Clears the cached problems and solves.
 */
export function clearCache(): void {
  _problems = [];
  _solves = [];
}

/**
 * Checks if the data is primed (loaded into memory).
 */
export function isPrimed(): boolean {
  return _problems.length > 0 && _solves.length > 0;
}

// ---------------- helpers ----------------

/**
 * Calculates a boost factor based on how long ago a problem was solved.
 * Older solves receive a higher boost, capped at 1.
 */
function recencyBoost(daysAgo: number): number {
  return Math.min(1, daysAgo / 90);
}

/**
 * Selects `k` items from a list, weighted by their scores.
 */
function weightedSample<T>(items: T[], weights: number[], k: number): T[] {
  if (items.length === 0) return [];
  const picked: T[] = [];
  const w = [...weights];
  const copy = [...items];
  for (let i = 0; i < Math.min(k, items.length); i++) {
    const sum = w.reduce((a, b) => a + b, 0);
    if (sum === 0) break;
    let r = Math.random() * sum;
    let idx = 0;
    while (r >= w[idx]) {
      r -= w[idx];
      idx++;
    }
    picked.push(copy[idx]);
    copy.splice(idx, 1);
    w.splice(idx, 1);
  }
  return picked;
}

// ---------------- public API ----------------

/**
 * Return weighted‑random problem recommendations for a single category.
 * Requires `primeData` to have been called at least once.
 */
export async function getCategorySuggestions(
  tag: Category,
  k = 3,
): Promise<CategoryRecommendation> {
  if (!isPrimed()) await primeData();

  const nowMs = Date.now();
  const solveMap = new Map<string, Solve[]>();
  for (const s of _solves) {
    if (!s.tags?.includes(tag)) continue;
    if (!solveMap.has(s.slug)) solveMap.set(s.slug, []);
    solveMap.get(s.slug)!.push(s);
  }

  const fundamentals: Array<[ProblemLite, number]> = [];
  const refresh: Array<[ProblemLite, number]> = [];
  const fresh: Array<[ProblemLite, number]> = [];

  for (const p of _problems) {
    if (!p.tags.includes(tag)) continue;

    const lite: ProblemLite = {
      slug: p.slug,
      title: p.title,
      difficulty: p.difficulty,
      popularity: p.popularity,
      isFundamental: p.isFundamental,
    };

    const solved = solveMap.get(p.slug);
    const popularityScore = p.popularity; // already 0‑1 !! This assumption is wrong

    if (solved && solved.length) {
      // Candidate for refresh
      const latest = solved.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
      const daysAgo = Math.floor((nowMs - latest.timestamp * 1000) / 86_400_000);
      const boost = recencyBoost(daysAgo);
      const quality =
        latest.qualityScore ?? (latest.status === 'Accepted' ? DEFAULT_QUALITY_SCORE : 0);
      const refreshScore = (1 - quality) * boost * (0.7 + 0.3 * popularityScore);

      if (boost > 0.1 || quality < 0.85) {
        refresh.push([lite, refreshScore]);
      }
    } else {
      // unsolved → either fundamental or new
      // TODO: consider changing selection to be equal among difficulty levels
      if (p.isFundamental) {
        fundamentals.push([lite, popularityScore + 0.2]);
      } else {
        fresh.push([lite, popularityScore]);
      }
    }
  }

  const pick = (pool: Array<[ProblemLite, number]>) =>
    weightedSample(
      pool.map((x) => x[0]),
      pool.map((x) => x[1]),
      k,
    );

  return {
    tag,
    fundamentals: pick(fundamentals),
    refresh: pick(refresh),
    new: pick(fresh),
  };
}
