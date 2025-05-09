import { allCategories, Category, Difficulty, Problem, Solve } from '../types/types';

const SOLVES_BASE_URL = import.meta.env.VITE_SOLVES_BASE_URL;

// Raw problem data shape from your external JSON file
interface RawProblemData {
  slug: string;
  title: string;
  isPaidOnly: boolean;
  isFundamental: boolean;
  popularity: number;
  difficulty: string;
  topicTags: string[];
  likes: number;
  dislikes: number;
  /** optional in problems‑lite.json */
  description?: string;
  createdAt: number; // epock time
}

// Response from alfa-leetcode-api
interface RawSubmissionResponse {
  count: number;
  submission: {
    title: string;
    titleSlug: string;
    timestamp: string;
    statusDisplay: string;
    lang: string;
  }[];
}

const categorySet = new Set(allCategories);
export function mapTagsToCategories(tags: string[]): Category[] {
  return tags.filter((tag): tag is Category => categorySet.has(tag as Category));
}

// Fetch full problem catalog from hosted JSON (URL configurable)
export async function fetchProblemCatalog(url: string): Promise<Problem[]> {
  const res = await fetch(url);
  const data: RawProblemData[] = await res.json();

  return data.map((p) => ({
    slug: p.slug,
    title: p.title,
    tags: mapTagsToCategories(p.topicTags),
    description: p.description ?? '',
    difficulty: p.difficulty as Difficulty,
    popularity: p.popularity,
    isPaid: p.isPaidOnly,
    isFundamental: p.isFundamental,
    createdAt: p.createdAt,
  }));
}

// Fetch user's info to verify if the user exists
export async function verifyUser(username: string): Promise<{ exists: boolean }> {
  const res = await fetch(`${SOLVES_BASE_URL}/${username}`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();

  // Check if the response contains errors or matchedUser is null
  if (data.errors || data.data?.matchedUser === null) {
    return { exists: false };
  }

  return { exists: true };
}

// Fetch recent solves for a given LeetCode username
export async function fetchRecentSolves(username: string): Promise<Solve[]> {
  const res = await fetch(`${SOLVES_BASE_URL}/${username}/submission`);

  if (res.status === 429) {
    const err: any = new Error('Rate limited');
    err.code = 'RATE_LIMITED';
    throw err;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data: RawSubmissionResponse = await res.json();

  return data.submission.map((s) => ({
    slug: s.titleSlug,
    title: s.title,
    timestamp: Number(s.timestamp),
    status: s.statusDisplay,
    lang: s.lang,
  }));
}
