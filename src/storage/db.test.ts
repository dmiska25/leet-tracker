import { describe, it, expect, afterEach } from 'vitest';
import { db } from './db';
import { Problem, Solve, GoalProfile, Difficulty } from '../types/types';

const exampleProblem: Problem = {
  slug: 'two-sum',
  title: 'Two Sum',
  tags: ['Array'],
  description: 'desc',
  difficulty: Difficulty.Easy,
  popularity: 0.9,
  isPaid: false,
  isFundamental: true,
  createdAt: 1746308137,
};

const exampleSolve: Solve = {
  slug: 'two-sum',
  title: 'Two Sum',
  timestamp: 1234567890,
  status: 'Accepted',
  lang: 'python3',
};

const exampleProfile: GoalProfile = {
  id: 'default',
  name: 'Default Goals',
  description: 'Default goal profile',
  goals: {
    Array: 0.6,
    String: 0.6,
    'Hash Table': 0.6,
    'Two Pointers': 0.6,
    'Sliding Window': 0.6,
    Stack: 0.6,
    Queue: 0.6,
    'Linked List': 0.6,
    Tree: 0.6,
    Graph: 0.6,
    'Dynamic Programming': 0.6,
    Greedy: 0.6,
    'Binary Search': 0.6,
    Math: 0.6,
    Backtracking: 0.6,
    'Heap (Priority Queue)': 0.6,
  },
  createdAt: new Date().toISOString(),
  isEditable: true,
};

describe('db storage module', () => {
  afterEach(async () => {
    // IndexedDB persists across tests — clearing it ensures isolation
    indexedDB.deleteDatabase('leet-tracker-db');
  });

  it('stores and retrieves the username', async () => {
    await db.setUsername('dmiska');
    const username = await db.getUsername();
    expect(username).toBe('dmiska');
  });

  it('stores and retrieves a problem', async () => {
    await db.addOrUpdateProblem(exampleProblem);
    const problems = await db.getAllProblems();
    expect(problems).toHaveLength(1);
    expect(problems[0].slug).toBe('two-sum');
  });

  it('stores and retrieves a solve', async () => {
    await db.saveSolve(exampleSolve);
    const solves = await db.getAllSolves();
    expect(solves).toHaveLength(1);
    expect(solves[0].slug).toBe('two-sum');
  });

  it('stores and retrieves a goal profile', async () => {
    await db.saveGoalProfile(exampleProfile);
    const result = await db.getGoalProfile('default');
    expect(result?.id).toBe('default');
    expect(result?.goals.Array).toBe(0.6);
  });

  it('sets and retrieves the active goal profile ID', async () => {
    await db.setActiveGoalProfile('default');
    const active = await db.getActiveGoalProfileId();
    expect(active).toBe('default');
  });

  it('sets and retrieves the problem list last update timestamp', async () => {
    await db.setProblemListLastUpdated(1746308137);
    const timestamp = await db.getProblemListLastUpdated();
    expect(timestamp).toBe(1746308137);
  });
});
