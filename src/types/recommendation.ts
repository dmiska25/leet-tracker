import { Category, Difficulty } from './types';

export interface ProblemLite {
  slug: string;
  title: string;
  difficulty: Difficulty;
  popularity: number; // 0‑1 normalised
  isFundamental: boolean;
}

export interface CategoryRecommendation {
  tag: Category;
  fundamentals: ProblemLite[];
  refresh: ProblemLite[];
  new: ProblemLite[];
}
