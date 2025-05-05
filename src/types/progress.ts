import { Category } from './types';

/**
 * Per‑category progress payload sent to the UI.
 *
 * `goal` comes from the user’s active goal profile,
 * while the other fields are derived from solve history.
 */
export interface CategoryProgress {
  tag: Category;
  goal: number; // target skill level 0‑1
  estimatedScore: number; // raw skill estimate 0‑1
  confidenceLevel: number; // how much evidence we have 0‑1
  adjustedScore: number; // estimatedScore * confidenceLevel
}
