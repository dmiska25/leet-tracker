import { db } from '@/storage/db';
import { evaluateCategoryProgress } from './progress';
import { clearCache, primeData, setSolves } from './recommendations';
import type { CategoryProgress } from '@/types/progress';
import type { GoalProfile, Category } from '@/types/types';

/**
 * Compute dashboard progress from current database state.
 * Does NOT fetch any external data - pure computation.
 *
 * Used by Dashboard to refresh its display after solve updates.
 *
 * @param profile - The active goal profile to compute progress for
 * @returns Progress data for all categories in the goal profile
 */
export async function computeDashboardProgress(profile: GoalProfile): Promise<CategoryProgress[]> {
  console.log('[computeDashboardProgress] Computing progress from DB');

  // Load solve history
  const solves = await db.getAllSolves();

  // Update recommendations cache
  clearCache();
  setSolves(solves);
  await primeData();

  const goals = profile.goals;

  // Compute progress for each category in profile
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

  return progress;
}
