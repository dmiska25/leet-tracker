import { db } from '../storage/db';
import { fetchProblemCatalog, fetchRecentSolves } from '../api/leetcode';

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

export async function initApp(): Promise<{
  username: string | undefined;
  additionalData: Boolean | undefined;
}> {
  const username = await db.getUsername();
  if (!username) {
    console.log('[initApp] No username — app not initialized');
    return { username: undefined, additionalData: undefined };
  }

  console.log(`[initApp] Username found: ${username}`);

  // 1. Update problem list if needed
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

  // 2. Sync recent solves
  var additionalData = false;
  try {
    const recent = await fetchRecentSolves(username);

    // check if the first solve is in the db, if no, set additionalData to true
    const firstSolve = recent[0];
    const firstSolveData = await db.getSolve(firstSolve.slug, firstSolve.timestamp);
    if (!firstSolveData) {
      additionalData = true;
    }

    await db.withTransaction(['solves'], async (tx) => {
      for (const solve of recent) {
        const key = `${solve.slug}|${solve.timestamp}`;
        await tx.objectStore('solves').put(solve, key);
      }
      console.log(`[initApp] Synced ${recent.length} recent solves`);
    });
  } catch (err) {
    console.error('[initApp] Failed to sync recent solves:', err);
  }

  return { username: username, additionalData: additionalData };
}
