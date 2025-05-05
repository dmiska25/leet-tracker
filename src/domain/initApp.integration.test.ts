import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IDBPDatabase, openDB } from 'idb';
import { initApp } from './initApp';
import { LeetTrackerDB, db } from '../storage/db';
import { readFile } from 'fs/promises';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the database module
vi.mock('../storage/db');

describe('initApp (integration with fake‑indexeddb)', () => {
  let testDb: IDBPDatabase<LeetTrackerDB>;

  beforeEach(async () => {
    // Mock the fetch function
    vi.stubGlobal('fetch', async (input: string) => {
      if (input === '/sample-problems.json') {
        // Load sample-problems.json from the public folder
        const filePath = path.join(__dirname, '../../public/sample-problems.json');
        const fileContents = await readFile(filePath, 'utf-8');
        return new Response(fileContents, {
          headers: { 'Content-Type': 'application/json' },
        });
      } else if (input === 'https://alfa-leetcode-api.onrender.com/testuser/submission') {
        return new Response(
          JSON.stringify({
            submission: [
              {
                titleSlug: 'two-sum',
                title: 'Two Sum',
                timestamp: '1746032384',
                statusDisplay: 'Accepted',
                lang: 'Python',
              },
              {
                titleSlug: 'add-two-numbers',
                title: 'Add Two Numbers',
                timestamp: '1746032385',
                statusDisplay: 'Accepted',
                lang: 'Python',
              },
            ],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
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
        db.createObjectStore('goal-profiles');
        db.createObjectStore('active-goal-profile');
      },
    });

    // Set up the mock implementations after testDb is initialized
    vi.mocked(db.getUsername).mockImplementation(() => testDb.get('leetcode-username', 'username'));
    vi.mocked(db.getAllProblems).mockImplementation(() => testDb.getAll('problem-list'));
    vi.mocked(db.getProblemListLastUpdated).mockImplementation(() =>
      testDb.get('problem-metadata', 'lastUpdated'),
    );
    vi.mocked(db.getAllSolves).mockImplementation(() => testDb.getAll('solves'));
    vi.mocked(db.getSolve).mockImplementation((slug: string, timestamp: number) =>
      testDb.get('solves', `${slug}|${timestamp}`),
    );
    vi.mocked(db.withTransaction).mockImplementation(async (storeNames, callback) => {
      const tx = testDb.transaction(storeNames, 'readwrite');
      await callback(tx);
      await tx.done;
    });

    // Set up test data
    await testDb.put('leetcode-username', 'testuser', 'username');
    await testDb.put('problem-metadata', 1746208137, 'lastUpdated');
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
    });
  });
});
