import { allCategories, Category, Difficulty, Problem, Solve } from '../types/types';
import { loadDemoSolves } from './demo';

const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME;

/** LeetCode GraphQL proxy endpoint (serverless function) see: api/leetcode-graphql.ts */
const GRAPHQL_URL = '/api/leetcode-graphql';

/* ----------------------------- Types (problems) ----------------------------- */
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
  /** optional in problems-lite.json */
  description?: string;
  createdAt: number; // epoch time (seconds)
}

/* ------------------------------ Tag utilities ------------------------------ */
const categorySet = new Set(allCategories);
export function mapTagsToCategories(tags: string[]): Category[] {
  return tags.filter((tag): tag is (typeof allCategories)[number] =>
    categorySet.has(tag as (typeof allCategories)[number]),
  );
}

/* ------------------------- Problem catalog (unchanged) ---------------------- */
export async function fetchProblemCatalog(url: string): Promise<Problem[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
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

/* ----------------------------- GraphQL helper ------------------------------ */
type GraphQLErrorShape = { message?: string };
type GraphQLResponse<T> = { data?: T; errors?: GraphQLErrorShape[] };

async function leetcodeGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    const err: any = new Error('Rate limited');
    err.code = 'RATE_LIMITED';
    throw err;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = (await res.json()) as GraphQLResponse<T>;
  if (json.errors && json.errors.length) {
    // Let callers decide whether to swallow or interpret as "not found".
    const msg = json.errors[0]?.message ?? 'GraphQL error';
    throw new Error(msg);
  }
  if (!json.data) {
    throw new Error('Empty GraphQL response');
  }
  return json.data;
}

/* --------------------------------- Queries --------------------------------- */
const GET_RECENT_SUBMISSIONS = `#graphql
query getRecentSubmissions($username: String!, $limit: Int) {
  recentSubmissionList(username: $username, limit: $limit) {
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}
`;

const DOES_USER_EXIST = `#graphql
query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    username
  }
}
`;

/* ------------------------------- Public API -------------------------------- */
/**
 * Verify a LeetCode username exists using a minimal GraphQL query.
 */
export async function verifyUser(username: string): Promise<{ exists: boolean }> {
  try {
    const data = await leetcodeGraphQL<{ matchedUser: { username: string } | null }>(
      DOES_USER_EXIST,
      { username },
    );
    return { exists: Boolean(data?.matchedUser) };
  } catch (error) {
    // Handle the specific "user doesn't exist" error
    if (error instanceof Error && error.message === 'That user does not exist.') {
      return { exists: false };
    }
    // Re-throw other errors (like rate limiting, network issues, etc.)
    throw error;
  }
}

/**
 * Fetch recent solves for a given LeetCode username (last 20 submissions).
 * Preserves DEMO user override and RATE_LIMITED error signaling.
 */
export async function fetchRecentSolves(username: string): Promise<Solve[]> {
  if (username === DEMO_USERNAME) {
    return loadDemoSolves();
  }

  type RecentSub = {
    title: string;
    titleSlug: string;
    timestamp: string | number;
    statusDisplay: string;
    lang: string;
  };

  const data = await leetcodeGraphQL<{ recentSubmissionList: RecentSub[] }>(
    GET_RECENT_SUBMISSIONS,
    {
      username,
      limit: 20,
    },
  );

  const list = data.recentSubmissionList ?? [];
  return list.map((s) => ({
    slug: s.titleSlug,
    title: s.title,
    timestamp: Number(s.timestamp),
    status: s.statusDisplay,
    lang: s.lang,
  }));
}
