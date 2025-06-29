/* eslint-disable no-unused-vars */
// Possible difficulties
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

export const allCategories = [
  'Counting',
  'Binary Search Tree',
  'Concurrency',
  'Dynamic Programming',
  'Matrix',
  'Memoization',
  'Union Find',
  'Line Sweep',
  'Interactive',
  'Number Theory',
  'Backtracking',
  'Array',
  'Rejection Sampling',
  'Geometry',
  'Randomized',
  'String',
  'Topological Sort',
  'Binary Indexed Tree',
  'String Matching',
  'Enumeration',
  'Binary Tree',
  'Doubly-Linked List',
  'Heap (Priority Queue)',
  'Binary Search',
  'Combinatorics',
  'Bucket Sort',
  'Greedy',
  'Trie',
  'Prefix Sum',
  'Bitmask',
  'Linked List',
  'Depth-First Search',
  'Database',
  'Graph',
  'Divide and Conquer',
  'Tree',
  'Breadth-First Search',
  'Recursion',
  'Shortest Path',
  'Design',
  'Eulerian Circuit',
  'Biconnected Component',
  'Stack',
  'Monotonic Stack',
  'Hash Table',
  'Rolling Hash',
  'Two Pointers',
  'Sorting',
  'Ordered Set',
  'Probability and Statistics',
  'Hash Function',
  'Quickselect',
  'Queue',
  'Strongly Connected Component',
  'Segment Tree',
  'Minimum Spanning Tree',
  'Radix Sort',
  'Math',
  'Monotonic Queue',
  'Merge Sort',
  'Bit Manipulation',
  'Data Stream',
  'Shell',
  'Sliding Window',
  'Simulation',
  'Counting Sort',
  'Game Theory',
  'Iterator',
  'Brainteaser',
  'Reservoir Sampling',
  'Suffix Array',
] as const;

export type Category = (typeof allCategories)[number] | 'Random';

// Core LeetCode problem definition
export interface Problem {
  slug: string;
  title: string;
  tags: Category[];
  description: string;
  difficulty: Difficulty;
  popularity: number; // 0.0–1.0
  isPaid: boolean; // true if problem is paid
  isFundamental: boolean; // infered from ai model
  createdAt: number; // epoch time in seconds
}

// Single user solve attempt
export interface Solve {
  slug: string;
  title: string;
  timestamp: number; // epoch time in seconds
  status: string;
  lang: string; // e.g. "python3", "cpp", etc.
  code?: string; // full source code
  /** Optional problem description at time of solve */
  problemDescription?: string;
  difficulty?: Difficulty; // ← optional at first, inferred from Problem DB
  tags?: Category[]; // ← optional at first, inferred from Problem DB
  timeUsed?: number; // Optional: user input later
  hintUsed?: boolean; // Optional: if user flags this
  /** Additional details recorded by the user */
  solveDetails?: {
    solveTime?: string;
    usedHints?: 'none' | 'leetcode_hint' | 'solution_peek' | 'gpt_help';
    userNotes?: string;
  };
  /** Structured feedback from manual entry or LLM */
  feedback?: {
    performance: {
      time_to_solve: number;
      time_complexity: string;
      space_complexity: string;
      comments: string;
    };
    code_quality: {
      readability: number;
      correctness: number;
      maintainability: number;
      comments: string;
    };
    summary: {
      final_score: number;
      comments: string;
    };
  };
  qualityScore?: number; // Optional: manual or GPT
}

// Scoring summary for a category
export interface CategoryScore {
  tag: Category;
  estimatedScore: number; // [0.0–1.0]
  confidence: number; // [0.0–1.0]
  adjustedScore: number; // confidence-weighted score [0.0–1.0]
}

export type GoalMap = Partial<Record<Category, number>>;
export interface GoalProfile {
  id: string; // Unique identifier
  name: string; // User-visible name (e.g. "My Custom Goals")
  description?: string; // Optional details
  goals: GoalMap; // Goals by category
  createdAt: string; // epoch time in milliseconds
  isEditable: boolean; // If false, profile is locked(default profile)
}
