/* eslint-disable no-unused-vars */
// Possible difficulties
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export const allCategories = [
  'Array',
  'String',
  'Hash Table',
  'Two Pointers',
  'Sliding Window',
  'Stack',
  'Queue',
  'Linked List',
  'Tree',
  'Graph',
  'Dynamic Programming',
  'Greedy',
  'Binary Search',
  'Math',
  'Backtracking',
  'Heap',
] as const;

export type Category = (typeof allCategories)[number];

// Core LeetCode problem definition
export interface Problem {
  slug: string;
  title: string;
  tags: Category[];
  description: string;
  difficulty: Difficulty;
  popularity: number; // 0.0–1.0
  isFundamental: boolean; // infered from ai model
  createdAt: number; // epock time
}

// Single user solve attempt
export interface Solve {
  slug: string;
  title: string;
  timestamp: number; // Unix timestamp as number (from API)
  status: string;
  lang: string; // e.g. "python3", "cpp", etc.
  difficulty?: Difficulty; // ← optional at first, inferred from Problem DB
  tag?: Category; // ← optional at first, inferred from Problem DB
  timeUsed?: number; // Optional: user input later
  hintUsed?: boolean; // Optional: if user flags this
  qualityScore?: number; // Optional: manual or GPT
}

// Scoring summary for a category
export interface CategoryScore {
  tag: Category;
  estimatedScore: number; // [0.0–1.0]
  confidence: number; // [0.0–1.0]
  adjustedScore: number; // confidence-weighted score [0.0–1.0]
}

export type GoalMap = Record<Category, number>;
export interface GoalProfile {
  id: string; // Unique identifier
  name: string; // User-visible name (e.g. "My Custom Goals")
  description?: string; // Optional details
  goals: GoalMap; // REQUIRED: must define all categories
  createdAt: string; // ISO string
  isEditable: boolean; // If false, profile is locked(default profile)
}
