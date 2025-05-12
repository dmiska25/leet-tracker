import { Difficulty, Solve } from '../types/types';
import { CategoryProgress } from '../types/progress';

const DEFAULT_QUALITY_SCORE = 0.8;
const SUGGESTED_CATEGORY_SOLVES = 20;
const difficultyWeights: Record<Difficulty, number> = {
  [Difficulty.Easy]: 1.0,
  [Difficulty.Medium]: 1.2,
  [Difficulty.Hard]: 1.5,
};

function recencyDecay(daysAgo: number): number {
  return Math.max(0, 1 - daysAgo / 90);
}

function getAttemptPenalty(attempts: number): number {
  if (attempts === 0) return 1.0;
  if (attempts === 1) return 0.9;
  if (attempts <= 3) return 0.7;
  return 0.5;
}

/**
 * Compute confidence‑weighted progress metrics for a single category.
 */
export function evaluateCategoryProgress(solves: Solve[]): Omit<CategoryProgress, 'tag' | 'goal'> {
  if (solves.length === 0) {
    return { estimatedScore: 0, confidenceLevel: 0, adjustedScore: 0 };
  }

  // Group by (problem, day)
  const grouped: Record<string, Solve[]> = {};
  for (const s of solves) {
    // Fallback if tags/difficulty missing
    if (!s.timestamp) continue;
    const date = new Date(s.timestamp * 1000).toISOString().slice(0, 10);
    // TODO: grouping by date is good but we should also consider
    // that repeated problems over multiple days should also not be
    // rewarded as highly as novel problems
    // Also, note that timezone is not considered in grouping, so all timestamps are treated as UTC
    // This will need to be addressed in the future
    const key = `${s.slug}|${date}`;
    (grouped[key] ||= []).push(s);
  }

  let totalScore = 0;
  let totalEvidence = 0;
  let totalEasyEquivalentEvidence = 0;
  const nowMs = Date.now();

  for (const attempts of Object.values(grouped)) {
    const accepted = attempts.filter((s) => s.status === 'Accepted');
    if (accepted.length === 0) continue;

    const latest = accepted.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
    const failedAttempts = attempts.filter((s) => s.status !== 'Accepted').length;

    const daysAgo = Math.floor((nowMs - latest.timestamp * 1000) / 86_400_000);
    const decay = recencyDecay(daysAgo);
    const diffWeight = difficultyWeights[latest.difficulty ?? Difficulty.Easy]; // NOTE: fallback _should_ never happen since we fill in difficulty
    const attemptPenalty = getAttemptPenalty(failedAttempts);

    const quality = latest.qualityScore ?? DEFAULT_QUALITY_SCORE;
    const adjustedQuality = quality * attemptPenalty;

    const weight = decay * diffWeight;
    totalScore += adjustedQuality * weight;
    totalEvidence += weight;
    totalEasyEquivalentEvidence += decay * 1.0;
  }

  const estimated = totalEasyEquivalentEvidence > 0 ? totalScore / totalEasyEquivalentEvidence : 0;
  const confidence = Math.min(1, totalEvidence / SUGGESTED_CATEGORY_SOLVES);
  const adjusted = Math.min(1, estimated * confidence);

  return {
    estimatedScore: Math.round(Math.min(1, estimated) * 100) / 100,
    confidenceLevel: Math.round(confidence * 100) / 100,
    adjustedScore: Math.round(adjusted * 100) / 100,
  };
}
