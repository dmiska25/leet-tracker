import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mapTagsToCategories,
  fetchProblemCatalog,
  fetchRecentSolves,
  verifyUser,
} from './leetcode';

/* ------------------------------------------------------------------ */
/*  mapTagsToCategories                                                */
/* ------------------------------------------------------------------ */
describe('mapTagsToCategories', () => {
  it('includes only valid categories', () => {
    const input = ['Array', 'Tree', 'Graph'];
    expect(mapTagsToCategories(input)).toEqual(['Array', 'Tree', 'Graph']);
  });

  it('excludes unknown or misspelled categories', () => {
    const input = ['Array', 'Graphs', 'Dynamic Programming', 'HashMap'];
    expect(mapTagsToCategories(input)).toEqual(['Array', 'Dynamic Programming']);
  });

  it('returns empty array when no valid categories are given', () => {
    const input = ['Graphs', 'HashMaps', 'Quantum'];
    expect(mapTagsToCategories(input)).toEqual([]);
  });

  it('handles an empty input array', () => {
    expect(mapTagsToCategories([])).toEqual([]);
  });

  it('preserves order of valid tags', () => {
    const input = ['Math', 'Array', 'Queue'];
    expect(mapTagsToCategories(input)).toEqual(['Math', 'Array', 'Queue']);
  });
});

/* ------------------------------------------------------------------ */
/*  fetchProblemCatalog                                                */
/* ------------------------------------------------------------------ */
describe('fetchProblemCatalog', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('parses and maps valid problem data', async () => {
    const mockData = [
      {
        slug: 'two-sum',
        title: 'Two Sum',
        isPaidOnly: false,
        isFundamental: true,
        popularity: 0.9,
        difficulty: 'Easy',
        topicTags: ['Array', 'Hash Table'],
        likes: 54_000,
        dislikes: 2000,
        description: '<p>desc</p>',
        createdAt: 1746308137,
      },
    ];

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockData,
    });

    const result = await fetchProblemCatalog('https://example.com/data.json');

    expect(result).toEqual([
      {
        slug: 'two-sum',
        title: 'Two Sum',
        isFundamental: true,
        isPaid: false,
        popularity: 0.9,
        difficulty: 'Easy',
        description: '<p>desc</p>',
        tags: ['Array', 'Hash Table'],
        createdAt: 1746308137,
      },
    ]);
  });

  it('throws when HTTP status is not ok', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(fetchProblemCatalog('https://example.com/missing.json')).rejects.toThrow(
      'HTTP 404',
    );
  });
});

/* ------------------------------------------------------------------ */
/*  verifyUser                                                         */
/* ------------------------------------------------------------------ */
describe('verifyUser', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns {exists:true} when API responds with matchedUser', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          matchedUser: {
            username: 'foo',
          },
        },
      }),
    });

    expect(await verifyUser('foo')).toEqual({ exists: true });
  });

  it('returns {exists:false} when API returns matchedUser null', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { matchedUser: null } }),
    });

    expect(await verifyUser('bar')).toEqual({ exists: false });
  });

  it('returns {exists:false} when GraphQL error says "That user does not exist."', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [
          {
            message: 'That user does not exist.',
            locations: [{ line: 3, column: 3 }],
            path: ['matchedUser'],
            extensions: { handled: true },
          },
        ],
        data: { matchedUser: null },
      }),
    });

    expect(await verifyUser('nonexistent')).toEqual({ exists: false });
  });

  it('throws when HTTP status is not ok', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(verifyUser('err')).rejects.toThrow('HTTP 500');
  });

  it('throws other GraphQL errors normally', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [
          {
            message: 'Some other GraphQL error',
            locations: [{ line: 1, column: 1 }],
            path: ['matchedUser'],
          },
        ],
        data: { matchedUser: null },
      }),
    });

    await expect(verifyUser('erroruser')).rejects.toThrow('Some other GraphQL error');
  });
});

/* ------------------------------------------------------------------ */
/*  fetchRecentSolves                                                  */
/* ------------------------------------------------------------------ */
describe('fetchRecentSolves', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps raw submission data to Solve type', async () => {
    const mockGraphQLResponse = {
      data: {
        recentSubmissionList: [
          {
            title: 'Minimum Window Substring',
            titleSlug: 'minimum-window-substring',
            timestamp: '1746032384',
            statusDisplay: 'Accepted',
            lang: 'python3',
          },
          {
            title: 'Sliding Window Maximum',
            titleSlug: 'sliding-window-maximum',
            timestamp: '1746031189',
            statusDisplay: 'Accepted',
            lang: 'python3',
          },
        ],
      },
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockGraphQLResponse,
    });

    const result = await fetchRecentSolves('dmiska25');

    expect(result).toEqual([
      {
        slug: 'minimum-window-substring',
        title: 'Minimum Window Substring',
        timestamp: 1746032384,
        status: 'Accepted',
        lang: 'python3',
      },
      {
        slug: 'sliding-window-maximum',
        title: 'Sliding Window Maximum',
        timestamp: 1746031189,
        status: 'Accepted',
        lang: 'python3',
      },
    ]);
  });

  it('rejects with RATE_LIMITED error when HTTP 429', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(fetchRecentSolves('foo')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('throws generic error for non‑ok status', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(fetchRecentSolves('foo')).rejects.toThrow('HTTP 500');
  });
});
