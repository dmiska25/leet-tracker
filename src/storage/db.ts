import { openDB, DBSchema, IDBPTransaction } from 'idb';
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
    value: number; // Epoch timestamp
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
  'extension-sync': {
    key: 'lastTimestamp';
    value: number; // epoch seconds of most-recent extension solve
  };
}

// Create a union type of all valid store names
type ValidStoreName = keyof LeetTrackerDB;

const dbPromise = openDB<LeetTrackerDB>('leet-tracker-db', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      // v1 schema
      db.createObjectStore('leetcode-username');
      db.createObjectStore('problem-list');
      db.createObjectStore('problem-metadata');
      db.createObjectStore('solves');
      db.createObjectStore('goal-profiles');
      db.createObjectStore('active-goal-profile');
    }
    if (oldVersion < 2) {
      // v2 – extension support
      db.createObjectStore('extension-sync');
    }
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
  async getProblem(slug: string): Promise<Problem | undefined> {
    return (await dbPromise).get('problem-list', slug);
  },
  async addOrUpdateProblem(problem: Problem): Promise<string> {
    return (await dbPromise).put('problem-list', problem, problem.slug);
  },
  async setProblemListLastUpdated(epoch: number): Promise<string> {
    return (await dbPromise).put('problem-metadata', epoch, 'lastUpdated');
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
  async clearSolves(): Promise<void> {
    await this.withTransaction(['solves'], async (tx) => {
      const store = tx.objectStore('solves');
      const allSolves = await store.getAll();
      for (const solve of allSolves) {
        const key = `${solve.slug}|${solve.timestamp}`;
        await store.delete(key);
      }
    });
  },

  // Goal profiles
  async getGoalProfile(id: string): Promise<GoalProfile | undefined> {
    return (await dbPromise).get('goal-profiles', id);
  },
  async saveGoalProfile(profile: GoalProfile): Promise<string> {
    return (await dbPromise).put('goal-profiles', profile, profile.id);
  },
  async deleteGoalProfile(id: string): Promise<void> {
    return (await dbPromise).delete('goal-profiles', id);
  },
  async clearGoalProfiles(): Promise<void> {
    await this.withTransaction(['goal-profiles'], async (tx) => {
      const store = tx.objectStore('goal-profiles');
      const allProfiles = await store.getAll();
      for (const profile of allProfiles) {
        await store.delete(profile.id);
      }
    });
  },
  async setActiveGoalProfile(id: string): Promise<string> {
    return (await dbPromise).put('active-goal-profile', id, 'active');
  },
  async getActiveGoalProfileId(): Promise<string | undefined> {
    return (await dbPromise).get('active-goal-profile', 'active');
  },
  async getAllGoalProfiles(): Promise<GoalProfile[]> {
    return (await dbPromise).getAll('goal-profiles');
  },

  // Extension sync
  async getExtensionLastTimestamp(): Promise<number> {
    const ts = await (await dbPromise).get('extension-sync', 'lastTimestamp');
    return ts !== undefined ? ts : 0;
  },
  async setExtensionLastTimestamp(ts: number): Promise<string> {
    return (await dbPromise).put('extension-sync', ts, 'lastTimestamp');
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
    const tx = (await this.transaction(storeNames, 'readwrite')) as IDBPTransaction<
      LeetTrackerDB,
      any,
      'readwrite'
    >;
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
