import { openDB, DBSchema, IDBPTransaction, IDBTransactionMode } from 'idb';
import { Problem, Solve, GoalProfile } from '../types/types';

export interface LeetTrackerDB extends DBSchema {
  'leetcode-username': {
    key: 'username';
    value: string;
  };
  'problem-list': {
    key: string; // problem.slug
    value: Problem;
  };
  'problem-metadata': {
    key: 'lastUpdated';
    value: number; // Epock timestamp
  };
  solves: {
    key: string; // slug|timestamp
    value: Solve;
  };
  'goal-profiles': {
    key: string; // profileId
    value: GoalProfile;
  };
  'active-goal-profile': {
    key: 'active';
    value: string; // profileId
  };
}

// Create a union type of all valid store names
type ValidStoreName = keyof LeetTrackerDB;

const dbPromise = openDB<LeetTrackerDB>('leet-tracker-db', 1, {
  upgrade(db) {
    db.createObjectStore('leetcode-username');
    db.createObjectStore('problem-list');
    db.createObjectStore('problem-metadata');
    db.createObjectStore('solves');
    db.createObjectStore('goal-profiles');
    db.createObjectStore('active-goal-profile');
  },
});

export const db = {
  // User identity
  async getUsername(): Promise<string | undefined> {
    return (await dbPromise).get('leetcode-username', 'username');
  },
  async setUsername(username: string): Promise<string> {
    return (await dbPromise).put('leetcode-username', username, 'username');
  },

  // Problem catalog
  async getAllProblems(): Promise<Problem[]> {
    return (await dbPromise).getAll('problem-list');
  },
  async addOrUpdateProblem(problem: Problem): Promise<string> {
    return (await dbPromise).put('problem-list', problem, problem.slug);
  },
  async setProblemListLastUpdated(epock: number): Promise<string> {
    return (await dbPromise).put('problem-metadata', epock, 'lastUpdated');
  },
  async getProblemListLastUpdated(): Promise<number | undefined> {
    return (await dbPromise).get('problem-metadata', 'lastUpdated');
  },

  // Solves
  async getAllSolves(): Promise<Solve[]> {
    return (await dbPromise).getAll('solves');
  },
  async getSolve(slug: string, timestamp: number): Promise<Solve | undefined> {
    const key = `${slug}|${timestamp}`;
    return (await dbPromise).get('solves', key);
  },
  async saveSolve(solve: Solve): Promise<string> {
    const key = `${solve.slug}|${solve.timestamp}`;
    return (await dbPromise).put('solves', solve, key);
  },

  // Goal profiles
  async getGoalProfile(id: string): Promise<GoalProfile | undefined> {
    return (await dbPromise).get('goal-profiles', id);
  },
  async saveGoalProfile(profile: GoalProfile): Promise<string> {
    return (await dbPromise).put('goal-profiles', profile, profile.id);
  },
  async setActiveGoalProfile(id: string): Promise<string> {
    return (await dbPromise).put('active-goal-profile', id, 'active');
  },
  async getActiveGoalProfileId(): Promise<string | undefined> {
    return (await dbPromise).get('active-goal-profile', 'active');
  },

  // Transaction support
  async transaction(
    storeNames: ValidStoreName | ValidStoreName[],
    mode: IDBTransactionMode = 'readonly',
  ): Promise<IDBPTransaction<LeetTrackerDB, any, typeof mode>> {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const idb = await dbPromise;
    // cast to any so TS will pick the overload that accepts string[]:
    return idb.transaction(names as any, mode);
  },

  async withTransaction<T>(
    storeNames: ValidStoreName | ValidStoreName[],
    // eslint-disable-next-line no-unused-vars
    callback: (tx: IDBPTransaction<LeetTrackerDB, any, 'readwrite'>) => Promise<T>,
  ): Promise<T> {
    const tx = await this.transaction(storeNames, 'readwrite');
    try {
      const result = await callback(tx);
      await tx.done;
      return result;
    } catch (err) {
      tx.abort();
      throw err;
    }
  },
};
