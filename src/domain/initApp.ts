import { db } from '../storage/db';
import { fetchProblemCatalog, fetchRecentSolves } from '../api/leetcode';
import { Category, GoalProfile } from '../types/types';
import { evaluateCategoryProgress } from './progress';
import { CategoryProgress } from '../types/progress';
import { clearCache, primeData, setSolves } from './recommendations';
import { getActiveOrInitProfile } from './goalProfiles';
import { syncFromExtension } from './extensionSync';

const PROBLEM_CATALOG_URL = import.meta.env.VITE_PROBLEM_CATALOG_URL;

function isStale(epoch: number | undefined): boolean {
  if (!epoch) return true;
  // check if epoch is within the last 24 hours
  const now = new Date().getTime();
  const lastUpdated = new Date(epoch).getTime();
  const diff = now - lastUpdated;
  const diffInHours = diff / (1000 * 60 * 60);
  return diffInHours > 24;
}

/**
 * Fetches the problem catalog from the given URL and updates the local database.
 * @returns Promise<string[]> - A list of error messages
 */
async function updateProblemList(): Promise<string[]> {
  const lastUpdated = await db.getProblemListLastUpdated();
  if (isStale(lastUpdated)) {
    console.log('[initApp] Fetching latest problem catalog...');
    try {
      const remoteProblems = await fetchProblemCatalog(PROBLEM_CATALOG_URL);
      const newProblems = remoteProblems.filter(
        (problem) => !lastUpdated || problem.createdAt * 1000 > lastUpdated,
      );

      await db.withTransaction(['problem-list', 'problem-metadata'], async (tx) => {
        for (const problem of newProblems) {
          await tx.objectStore('problem-list').put(problem, problem.slug);
        }
        await tx.objectStore('problem-metadata').put(Date.now(), 'lastUpdated');
        console.log(`[initApp] Catalog updated — ${newProblems.length} new problems added`);
      });
      return [];
    } catch (err) {
      console.error('[initApp] Failed to fetch problem catalog:', err);
      return ['An unexpected error occurred, new problems are temporarily unavailable.'];
    }
  }
  return [];
}

async function updateSolves(username: string): Promise<string[]> {
  try {
    const recent = await fetchRecentSolves(username);

    await db.withTransaction(['solves', 'problem-list'], async (tx) => {
      for (const solve of recent) {
        // get the problem from the database
        const problem = await tx.objectStore('problem-list').get(solve.slug);
        if (!problem) {
          console.warn(
            `[initApp] Problem ${solve.slug} not found in local database, skipping solve`,
          );
          continue;
        }

        // update the tags and difficulty from the problem
        solve.tags = problem.tags;
        solve.difficulty = problem.difficulty;

        const key = `${solve.slug}|${solve.timestamp}`;
        await tx.objectStore('solves').put(solve, key);
      }
    });
    console.log(`[initApp] Synced ${recent.length} recent solves`);
    return [];
  } catch (err: any) {
    if (err?.code === 'RATE_LIMITED') {
      console.warn('[initApp] Rate limited by LeetCode API');
      return ['LeetCode API rate limit hit — recent solves are temporarily unavailable.'];
    } else {
      console.error('[initApp] Failed to sync recent solves:', err);
      return ['An unexpected error occurred, recent solves are temporarily unavailable.'];
    }
  }
}

export async function initApp(): Promise<{
  username: string | undefined;
  progress: CategoryProgress[] | undefined;
  errors: string[];
  extensionInstalled: boolean;
}> {
  const errors: string[] = [];
  const username = await db.getUsername();
  var extensionInstalled = false;
  if (!username) {
    console.log('[initApp] No username — app not initialized');
    return {
      username: undefined,
      progress: undefined,
      errors: [],
      extensionInstalled: extensionInstalled,
    };
  }

  console.log(`[initApp] Username found: ${username}`);

  // 1. Update problem list if needed
  const updateProblemListErrors = await updateProblemList();
  errors.push(...updateProblemListErrors);

  // 2. Sync recent solves (handle rate limiting gracefully)
  const updateSolvesErrors = await updateSolves(username);
  errors.push(...updateSolvesErrors);

  /* 2b. Try to pull supplementary data from browser extension */
  try {
    const added = await syncFromExtension(username);
    extensionInstalled = true;
    if (added) console.log(`[initApp] Added ${added} solves via extension`);
  } catch (err: any) {
    if (err?.code !== 'EXTENSION_UNAVAILABLE') {
      console.warn('[initApp] Extension sync failed', err);
      errors.push('An unexpected error occurred while syncing with the extension.');
    }
  }

  // 3. Load solve history + goal profile in one shot
  const solves = await db.getAllSolves();
  // clear recommendation cache and set solves
  clearCache();
  setSolves(solves);
  await primeData();

  // Load (or seed) active goal profile
  const profile: GoalProfile = await getActiveOrInitProfile();
  const goals = profile.goals;

  // 4. Compute progress only for the categories present in the profile
  const profileTags = Object.keys(goals) as Category[];
  const progress = profileTags.map((tag) => {
    const tagSolves = solves.filter((s) => s.tags?.includes(tag));
    const scores = evaluateCategoryProgress(tagSolves);
    return {
      tag,
      goal: goals[tag] as number,
      ...scores,
    };
  });

  return { username, progress, errors, extensionInstalled };
}
