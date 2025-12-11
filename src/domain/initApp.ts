import { db } from '../storage/db';
import { fetchProblemCatalog } from '../api/leetcode';
import { Category, GoalProfile } from '../types/types';
import { evaluateCategoryProgress } from './progress';
import { identifyUser, trackExtensionDetected } from '@/utils/analytics';
import { CategoryProgress } from '../types/progress';
import { clearCache, primeData, setSolves } from './recommendations';
import { getActiveOrInitProfile } from './goalProfiles';
import { syncFromExtension } from './extensionSync';

const PROBLEM_CATALOG_URL = import.meta.env.VITE_PROBLEM_CATALOG_URL;

function isStale(epoch: number | undefined, maxAgeMinutes: number): boolean {
  if (!epoch) return true;
  const now = new Date().getTime();
  const lastUpdated = new Date(epoch).getTime();
  const diff = now - lastUpdated;
  const diffInMinutes = diff / (1000 * 60);
  return diffInMinutes > maxAgeMinutes;
}

/**
 * Initializes the problem catalog on app startup (independent of user sign-in).
 * This runs once when the app loads, not on every sign-in.
 * Should be called from main.tsx or App.tsx before user authentication.
 */
export async function initProblemCatalog(): Promise<void> {
  try {
    console.log('[initProblemCatalog] Checking problem catalog...');
    const errors = await updateProblemList();
    if (errors.length > 0) {
      console.warn('[initProblemCatalog] Catalog update had errors:', errors);
    }
  } catch (err) {
    // Silently handle errors during catalog init (won't block app startup)
    console.error('[initProblemCatalog] Failed to initialize catalog:', err);
  }
}

/**
 * Fetches the problem catalog from the given URL and updates the local database.
 * This function can be called independently of user sign-in for lazy loading.
 * @returns Promise<string[]> - A list of error messages
 */
export async function updateProblemList(): Promise<string[]> {
  const lastUpdated = await db.getProblemListLastUpdated();
  if (isStale(lastUpdated, 24 * 60)) {
    // 24 hours in minutes
    console.log('[initApp] Fetching latest problem catalog...');
    try {
      const remoteProblems = await fetchProblemCatalog(PROBLEM_CATALOG_URL);
      const newProblems = remoteProblems.filter(
        (problem) => !lastUpdated || problem.createdAt * 1000 > lastUpdated,
      );

      await db.withTransaction(['problem-list', 'problem-metadata'], async (tx) => {
        for (const problem of newProblems) {
          await tx.objectStore('problem-list').put!(problem, problem.slug);
        }
        await tx.objectStore('problem-metadata').put!(Date.now(), 'lastUpdated');
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

/**
 * Code for LeetCode API solve fetching has been disabled.
 * All solve data now comes from the Chrome extension.
 */
// async function updateSolves(username: string): Promise<string[]> {
//   const lastSynced = await db.getRecentSolvesLastUpdated();

//   // Skip sync if recently updated
//   if (!isStale(lastSynced, 30)) {
//     // 30 minutes
//     console.log('[initApp] Recent solves are up to date, skipping API call');
//     return [];
//   }

//   try {
//     console.log('[initApp] Fetching recent solves from LeetCode API...');
//     const recent = await fetchRecentSolves(username);

//     for (const solve of recent) {
//       // Fetch problem from DB to enrich tags/difficulty
//       const problem = await db.getProblem(solve.slug);
//       if (!problem) {
//         console.warn(`[initApp] Problem ${solve.slug} not found in local database, skipping solve`);
//         continue;
//       }

//       // Attach canonical tags & difficulty
//       solve.tags = problem.tags;
//       solve.difficulty = problem.difficulty;

//       // Skip if already present for this user
//       const existing = await db.getSolve(solve.slug, solve.timestamp);
//       if (existing) continue;

//       // Persist via centralized DB API (namespacing handled inside db.ts)
//       await db.saveSolve(solve);
//     }

//     // Set the per-user sync timestamp (namespacing handled inside db.ts)
//     await db.setRecentSolvesLastUpdated(Date.now());

//     console.log(`[initApp] Synced ${recent.length} recent solves`);
//     return [];
//   } catch (err: any) {
//     if (err?.code === 'RATE_LIMITED') {
//       console.warn('[initApp] Rate limited by LeetCode API');
//       return ['LeetCode API rate limit hit — recent solves are temporarily unavailable.'];
//     } else {
//       console.error('[initApp] Failed to sync recent solves:', err);
//       return ['An unexpected error occurred, recent solves are temporarily unavailable.'];
//     }
//   }
// }

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

  // 1. Problem catalog is loaded separately on app startup (lazy loading)
  // No need to block sign-in on catalog load

  // 2. Extension sync is the PRIMARY data source for solve data
  const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME;
  if (username !== DEMO_USERNAME) {
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

  // Identify user & track app open
  await identifyUser(username, {
    extensionInstalled,
    profileId: profile.id,
    lastSync: Date.now(),
  });
  if (extensionInstalled) trackExtensionDetected();

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

/**
 * Reset the recent solves sync timestamp to force a fresh sync on next initApp call.
 * Useful when user explicitly wants to sync fresh data.
 */
export async function resetRecentSolvesCache(): Promise<void> {
  await db.setRecentSolvesLastUpdated(0);
}
