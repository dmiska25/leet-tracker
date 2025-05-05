import { db } from '../storage/db';
import { fetchProblemCatalog, fetchRecentSolves } from '../api/leetcode';
import { Category, GoalProfile } from '../types/types';
import { evaluateCategoryProgress } from './progress';
import { CategoryProgress } from '../types/progress';
import { clearCache, primeData, setSolves } from './recommendations';
import { getActiveOrInitProfile } from './goalProfiles';

const PROBLEM_CATALOG_URL = import.meta.env.VITE_PROBLEM_CATALOG_URL ?? '/sample-problems.json';

function isStale(epock: number | undefined): boolean {
  if (!epock) return true;
  // check if epock is within the last 24 hours
  const now = new Date().getTime();
  const lastUpdated = new Date(epock).getTime();
  const diff = now - lastUpdated;
  const diffInHours = diff / (1000 * 60 * 60);
  return diffInHours > 24;
}

async function updateProblemList() {
  const lastUpdated = await db.getProblemListLastUpdated();
  if (isStale(lastUpdated)) {
    console.log('[initApp] Fetching latest problem catalog...');
    try {
      const remoteProblems = await fetchProblemCatalog(PROBLEM_CATALOG_URL);
      const newProblems = remoteProblems.filter(
        (problem) => !lastUpdated || problem.createdAt > lastUpdated,
      );

      await db.withTransaction(['problem-list', 'problem-metadata'], async (tx) => {
        for (const problem of newProblems) {
          await tx.objectStore('problem-list').put(problem, problem.slug);
        }
        await tx.objectStore('problem-metadata').put(Date.now(), 'lastUpdated');
        console.log(`[initApp] Catalog updated — ${newProblems.length} new problems added`);
      });
    } catch (err) {
      console.error('[initApp] Failed to fetch problem catalog:', err);
    }
  }
}

async function updateSolves(username: string) {
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
      console.log(`[initApp] Synced ${recent.length} recent solves`);
    });
  } catch (err) {
    console.error('[initApp] Failed to sync recent solves:', err);
  }
}

export async function initApp(): Promise<{
  username: string | undefined;
  progress: CategoryProgress[] | undefined;
}> {
  const username = await db.getUsername();
  if (!username) {
    console.log('[initApp] No username — app not initialized');
    return { username: undefined, progress: undefined };
  }

  console.log(`[initApp] Username found: ${username}`);

  // 1. Update problem list if needed
  await updateProblemList();

  // 2. Sync recent solves
  await updateSolves(username);

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

  return { username, progress };
}
