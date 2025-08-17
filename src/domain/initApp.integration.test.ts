import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDBPDatabase, openDB } from 'idb';
import { initApp } from './initApp';
import { LeetTrackerDB, db } from '../storage/db';
import { readFile } from 'fs/promises';
import { getManifestSince, getChunk } from '../api/extensionBridge';
import path from 'path';

// Mock the database module
vi.mock('../storage/db');
vi.mock('../api/extensionBridge');

describe('initApp (integration with fake‑indexeddb)', () => {
  let testDb: IDBPDatabase<LeetTrackerDB>;

  beforeEach(async () => {
    // Mock the fetch function
    vi.stubGlobal('fetch', async (input: string, options?: { method?: string; body?: string }) => {
      if (input === '/sample-problems.json') {
        // Load sample-problems.json from the public folder
        const filePath = path.join(__dirname, '../../public/sample-problems.json');
        const fileContents = await readFile(filePath, 'utf-8');
        return new Response(fileContents, {
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (input === '/default-goal-profiles.json') {
        // Serve default-goal-profiles.json so initApp can seed the default profile
        const filePath = path.join(__dirname, '../../public/default-goal-profiles.json');
        const fileContents = await readFile(filePath, 'utf-8');
        return new Response(fileContents, {
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (input === '/api/leetcode-graphql' && options?.method === 'POST') {
        // Mock GraphQL endpoint for LeetCode data
        const body = (options?.body as string) || '{}';
        let parsedBody;
        try {
          parsedBody = JSON.parse(body);
        } catch {
          parsedBody = {};
        }

        // Use recent timestamps (within last 30 days) to ensure progress calculation works
        const now = Math.floor(Date.now() / 1000);
        const recentTimestamp1 = now - 24 * 60 * 60; // 1 day ago
        const recentTimestamp2 = now - 2 * 24 * 60 * 60; // 2 days ago

        // Check if this is a recent submissions query
        if (parsedBody.query?.includes('recentSubmissionList')) {
          return new Response(
            JSON.stringify({
              data: {
                recentSubmissionList: [
                  {
                    titleSlug: 'two-sum',
                    title: 'Two Sum',
                    timestamp: recentTimestamp1.toString(),
                    statusDisplay: 'Accepted',
                    lang: 'Python',
                  },
                  {
                    titleSlug: 'add-two-numbers',
                    title: 'Add Two Numbers',
                    timestamp: recentTimestamp2.toString(),
                    statusDisplay: 'Accepted',
                    lang: 'Python',
                  },
                ],
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        // For other GraphQL queries (like user verification), return appropriate responses
        if (parsedBody.query?.includes('matchedUser')) {
          return new Response(
            JSON.stringify({
              data: {
                matchedUser: { username: 'testuser' },
              },
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }

        // For other GraphQL queries, return empty response
        return new Response(JSON.stringify({ data: {} }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error(`Unhandled fetch path: ${input}`);
      }
    });

    // Create test database
    testDb = await openDB<LeetTrackerDB>('leet-tracker-db-test', 1, {
      upgrade(db) {
        db.createObjectStore('leetcode-username');
        db.createObjectStore('problem-list');
        db.createObjectStore('problem-metadata');
        db.createObjectStore('solves');
        db.createObjectStore('solves-metadata');
        db.createObjectStore('goal-profiles');
        db.createObjectStore('active-goal-profile');
        db.createObjectStore('extension-sync');
      },
    });
    type StoreName =
      | 'leetcode-username'
      | 'problem-list'
      | 'problem-metadata'
      | 'solves'
      | 'solves-metadata'
      | 'goal-profiles'
      | 'active-goal-profile'
      | 'extension-sync';

    // Set up the mock implementations after testDb is initialized
    vi.mocked(db.getUsername).mockImplementation(() => testDb.get('leetcode-username', 'username'));
    vi.mocked(db.getAllProblems).mockImplementation(() => testDb.getAll('problem-list'));
    vi.mocked(db.getProblem).mockImplementation((slug) => testDb.get('problem-list', slug));
    vi.mocked(db.getProblemListLastUpdated).mockImplementation(() =>
      testDb.get('problem-metadata', 'lastUpdated'),
    );
    vi.mocked(db.getRecentSolvesLastUpdated).mockImplementation(async () => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|recentSolvesLastUpdated`;
      return testDb.get('solves-metadata', key);
    });
    vi.mocked(db.setRecentSolvesLastUpdated).mockImplementation(async (epochMs) => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|recentSolvesLastUpdated`;
      return testDb.put('solves-metadata', epochMs, key);
    });
    vi.mocked(db.getExtensionLastTimestamp).mockImplementation(async () => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|lastTimestamp`;
      const result = await testDb.get('extension-sync', key);
      return result !== undefined ? result : 0;
    });
    vi.mocked(db.setExtensionLastTimestamp).mockImplementation(async (ts) => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|lastTimestamp`;
      return testDb.put('extension-sync', ts, key);
    });
    vi.mocked(db.addOrUpdateProblem).mockImplementation((problem) =>
      testDb.put('problem-list', problem, problem.slug),
    );
    vi.mocked(db.getAllSolves).mockImplementation(async () => {
      // Get all solve keys and filter by username prefix
      const username = await testDb.get('leetcode-username', 'username');
      const prefix = `${username}|`;

      const allKeys = await testDb.getAllKeys('solves');
      const userKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(prefix));

      const results = [];
      for (const k of userKeys) {
        const solve = await testDb.get('solves', k);
        if (solve) results.push(solve);
      }
      return results;
    });
    vi.mocked(db.getSolve).mockImplementation(async (slug: string, timestamp: number) => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|${slug}|${timestamp}`;
      return testDb.get('solves', key);
    });
    vi.mocked(db.saveSolve).mockImplementation(async (solve) => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|${solve.slug}|${solve.timestamp}`;
      return testDb.put('solves', { ...solve, username }, key);
    });
    vi.mocked(db.saveGoalProfile).mockImplementation(async (p) => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|${p.id}`;
      return testDb.put('goal-profiles', p, key);
    });
    vi.mocked(db.setActiveGoalProfile).mockImplementation(async (id) => {
      const username = await testDb.get('leetcode-username', 'username');
      const key = `${username}|active`;
      return testDb.put('active-goal-profile', id, key);
    });

    vi.mocked(db.withTransaction).mockImplementation(async (storeNames, callback) => {
      const tx = testDb.transaction(
        Array.isArray(storeNames) ? (storeNames as StoreName[]) : [storeNames as StoreName],
        'readwrite',
      );
      await callback(tx);
      await tx.done;
    });

    // Set up test data
    await testDb.put('leetcode-username', 'testuser', 'username');
    await testDb.put('problem-metadata', 1746208137152, 'lastUpdated');
  });

  afterEach(async () => {
    await window.indexedDB.deleteDatabase('leet-tracker-db-test');
    vi.resetModules();
  });

  it('should fetch and store real problem catalog and solves', async () => {
    const result = await initApp();

    // Verify username
    expect(result.username).toBe('testuser');

    // Verify progress
    expect(result.progress).toBeDefined();
    expect(result.progress?.length).toBeGreaterThan(0);

    // Verify progress for all categories
    for (const category of result.progress!) {
      expect(category).toHaveProperty('tag');
      expect(category).toHaveProperty('goal');
      expect(category).toHaveProperty('estimatedScore');
      expect(category).toHaveProperty('confidenceLevel');
      expect(category).toHaveProperty('adjustedScore');
      expect(category.estimatedScore).toBeGreaterThanOrEqual(0);
      expect(category.estimatedScore).toBeLessThanOrEqual(1);
      expect(category.confidenceLevel).toBeGreaterThanOrEqual(0);
      expect(category.confidenceLevel).toBeLessThanOrEqual(1);
      expect(category.adjustedScore).toBeGreaterThanOrEqual(0);
      expect(category.adjustedScore).toBeLessThanOrEqual(1);
    }

    // verify the specific categories from the sample data are non zero
    const categoriesToCheck = ['Array', 'Hash Table', 'Linked List', 'Math', 'Recursion'];
    for (const category of categoriesToCheck) {
      const progress = result.progress?.find((p) => p.tag === category);
      expect(progress).toBeDefined();
      expect(progress?.estimatedScore).toBeGreaterThan(0);
      expect(progress?.confidenceLevel).toBeGreaterThan(0);
      expect(progress?.adjustedScore).toBeGreaterThan(0);
    }

    // Verify real data was stored
    const problems = await db.getAllProblems();
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toHaveProperty('slug');
    expect(problems[0]).toHaveProperty('title');

    const solves = await db.getAllSolves();
    expect(solves.length).toBeLessThanOrEqual(20); // API returns max 20 solves
    if (solves.length > 0) {
      expect(solves[0]).toHaveProperty('slug');
      expect(solves[0]).toHaveProperty('timestamp');
    }

    // Verify metadata was updated
    const lastUpdated = await db.getProblemListLastUpdated();
    expect(lastUpdated).toBeDefined();
    expect(lastUpdated).toBeGreaterThan(0);
  });

  it('should handle initialization with no username', async () => {
    // Clear username from test DB
    await testDb.delete('leetcode-username', 'username');

    const result = await initApp();

    expect(result).toEqual({
      username: undefined,
      progress: undefined,
      errors: [],
      extensionInstalled: false,
    });
  });

  it('sets extensionInstalled when extension returns no new solves', async () => {
    /* Extension responds but has no new data */
    vi.mocked(getManifestSince).mockResolvedValue([{ index: 0, from: 0, to: 0 }]);
    vi.mocked(getChunk).mockResolvedValue([]);

    const result = await initApp();

    /* Flag should still indicate extension presence         */
    expect(result.extensionInstalled).toBe(true);
    /* Solve list should remain API-only (≤20)               */
    const solves = await db.getAllSolves();
    expect(solves.length).toBeLessThanOrEqual(20);
  });

  it('merges solves from multiple extension chunks', async () => {
    // Use recent timestamps (within last 30 days) to ensure progress calculation works
    const now = Math.floor(Date.now() / 1000);
    const recentTimestamp1 = now - 24 * 60 * 60; // 1 day ago
    const recentTimestamp2 = now - 2 * 24 * 60 * 60; // 2 days ago

    const chunk0 = [
      {
        titleSlug: 'two-sum',
        timestamp: recentTimestamp1,
        statusDisplay: 'Accepted',
        lang: 'Python',
      },
    ];
    const chunk1 = [
      {
        titleSlug: 'add-two-numbers',
        timestamp: recentTimestamp2,
        statusDisplay: 'Accepted',
        lang: 'TypeScript',
      },
    ];

    vi.mocked(getManifestSince).mockResolvedValue([
      { index: 0, from: 0, to: recentTimestamp1 },
      { index: 1, from: recentTimestamp1 + 1, to: recentTimestamp2 },
    ]);

    vi.mocked(getChunk).mockImplementation(async (_username: string, idx: number) => {
      return idx === 0 ? chunk0 : chunk1;
    });

    const result = await initApp();

    const solves = await db.getAllSolves();
    expect(solves.length).toBe(2);
    const slugs = solves.map((s) => s.slug);
    expect(slugs).toEqual(expect.arrayContaining(['two-sum', 'add-two-numbers']));
    expect(result.extensionInstalled).toBe(true);
  });
});
