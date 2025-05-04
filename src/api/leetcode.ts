import { allCategories, Category, Difficulty, Problem, Solve } from '../types/types';

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
  description: string;
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
    description: p.description,
    difficulty: p.difficulty as Difficulty,
    popularity: p.popularity,
    isFundamental: p.isFundamental,
    createdAt: p.createdAt,
  }));
}

// Fetch recent solves for a given LeetCode username
export async function fetchRecentSolves(username: string): Promise<Solve[]> {
  const res = await fetch(`https://alfa-leetcode-api.onrender.com/${username}/submission`);
  const data: RawSubmissionResponse = await res.json();

  return data.submission.map((s) => ({
    slug: s.titleSlug,
    title: s.title,
    timestamp: Number(s.timestamp),
    status: s.statusDisplay,
    lang: s.lang,
  }));
}
