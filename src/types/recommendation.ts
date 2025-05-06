import { Category, Difficulty } from './types';

export interface ProblemLite {
  slug: string;
  title: string;
  difficulty: Difficulty;
  popularity: number; // 0‑1 normalised
  isFundamental: boolean;
  tags?: Category[];
}

export interface CategoryRecommendation {
  tag: Category;
  fundamentals: ProblemLite[];
  refresh: ProblemLite[];
  new: ProblemLite[];
}
