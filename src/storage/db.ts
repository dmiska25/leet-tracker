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
    value: number; // Epoch timestamp (ms)
  };
  solves: {
    key: string; // ${username}|${slug}|${timestamp}
    value: Solve;
  };
  'solves-metadata': {
    key: string; // ${username}|recentSolvesLastUpdated
    value: number; // Epoch timestamp (ms)
  };
  'goal-profiles': {
    key: string; // ${username}|${profileId}
    value: GoalProfile;
  };
  'active-goal-profile': {
    key: string; // ${username}|active
    value: string; // profileId (not namespaced)
  };
  'extension-sync': {
    key: string; // ${username}|lastTimestamp
    value: number; // epoch seconds of most-recent extension solve
  };
}

// Create a union type of all valid store names
type ValidStoreName = keyof LeetTrackerDB;

/* ----------------------------------------------------------------------------
   DB init (version 3) + one-time migration from legacy global keys
---------------------------------------------------------------------------- */
const dbPromise = openDB<LeetTrackerDB>('leet-tracker-db', 3, {
  async upgrade(db, oldVersion, _newVersion, tx) {
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

    if (oldVersion < 3) {
      // v3 – migrate existing global data to per-user namespaced keys AND add username indexes

      db.createObjectStore('solves-metadata');

      // Add indexes for username-based queries
      const solvesStore = tx.objectStore('solves') as any;
      if (!solvesStore.indexNames.contains('username')) {
        solvesStore.createIndex('username', 'username');
      }

      const goalProfilesStore = tx.objectStore('goal-profiles') as any;
      if (!goalProfilesStore.indexNames.contains('username')) {
        goalProfilesStore.createIndex('username', 'username');
      }

      // If no username exists, we assume signed-out state ⇒ no data to migrate.
      const username = await (await dbPromise).get('leetcode-username', 'username');
      if (!username) {
        return; // nothing to migrate under your signed-out-clears-data model
      }
      const prefix = `${username}|`;

      // ---- solves: `${slug}|${timestamp}` → `${username}|${slug}|${timestamp}`
      const solveKeys = (await solvesStore.getAllKeys()) as string[];
      for (const k of solveKeys) {
        if (typeof k !== 'string') continue;
        // legacy solve key has exactly one pipe
        if (k.split('|').length === 2) {
          const val = await solvesStore.get(k as any);
          const target = `${prefix}${k}`;
          const existing = await solvesStore.get(target as any);
          if (val !== undefined && existing === undefined) {
            // Add username field when migrating
            const solveWithUsername = { ...val, username };
            await solvesStore.put(solveWithUsername, target as any);
          }
          await solvesStore.delete(k as any);
        }
      }

      // ---- goal-profiles: `${profileId}` → `${username}|${profileId}`
      const profStore = goalProfilesStore;
      const profKeys = (await profStore.getAllKeys()) as string[];
      for (const k of profKeys) {
        if (typeof k !== 'string') continue;
        // namespaced keys already start with `${username}|`
        if (!k.startsWith(prefix)) {
          const val = await profStore.get(k as any);
          const target = `${prefix}${k}`;
          const existing = await profStore.get(target as any);
          if (val !== undefined && existing === undefined) {
            // Add username field when migrating
            const profileWithUsername = { ...val, username };
            await profStore.put(profileWithUsername, target as any);
          }
          await profStore.delete(k as any);
        }
      }

      // ---- active-goal-profile: 'active' → `${username}|active`
      const activeStore = tx.objectStore('active-goal-profile');
      const legacyActiveVal = await activeStore.get('active');
      if (legacyActiveVal !== undefined) {
        const nsActiveKey = `${prefix}active`;
        const existing = await activeStore.get(nsActiveKey as any);
        if (existing === undefined) {
          await activeStore.put(legacyActiveVal, nsActiveKey as any);
        }
        await activeStore.delete('active' as any);
      }

      // ---- extension-sync: 'lastTimestamp' → `${username}|lastTimestamp`
      const extStore = tx.objectStore('extension-sync');
      const legacyTs = await extStore.get('lastTimestamp');
      if (legacyTs !== undefined) {
        const nsTsKey = `${prefix}lastTimestamp`;
        const existing = await extStore.get(nsTsKey as any);
        if (existing === undefined) {
          await extStore.put(legacyTs, nsTsKey as any);
        }
        await extStore.delete('lastTimestamp' as any);
      }

      // ---- problem-metadata: 'recentSolvesLastUpdated' → solves-metadata: `${username}|recentSolvesLastUpdated`
      // Keep 'lastUpdated' global in problem-metadata.
      const metaStore = tx.objectStore('problem-metadata');
      const solvesMetaStore = tx.objectStore('solves-metadata');
      const legacyRecent = await metaStore.get('recentSolvesLastUpdated' as any);
      if (legacyRecent !== undefined) {
        const nsRecentKey = `${prefix}recentSolvesLastUpdated`;
        const existing = await solvesMetaStore.get(nsRecentKey as any);
        if (existing === undefined) {
          await solvesMetaStore.put(legacyRecent, nsRecentKey as any);
        }
        await metaStore.delete('recentSolvesLastUpdated' as any);
      }
    }
  },
});

/* ----------------------------------------------------------------------------
   Public DB API (namespaced; no runtime legacy fallbacks)
---------------------------------------------------------------------------- */

export const db = {
  /* ----------------------------------------------------------------------------
     Private helpers for namespacing
  ---------------------------------------------------------------------------- */

  // Cache for username to avoid repeated database calls
  _usernameCache: null as string | undefined | null, // null = not loaded, undefined = no username

  async getUserPrefix(): Promise<string> {
    const u = await this.getUsername();
    // In practice, operations occur post sign-in; prefix with username.
    // We avoid "anonymous" now that v3 migration aligns data to a real user.
    return (u ?? 'anonymous') + '|';
  },

  /** Build namespaced solve key. */
  async nsSolveKey(slug: string, timestamp: number): Promise<string> {
    const prefix = await this.getUserPrefix();
    return `${prefix}${slug}|${timestamp}`;
  },

  /** Build namespaced per-user metadata key (keep 'lastUpdated' global). */
  async nsRecentSolvesKey(): Promise<string> {
    const prefix = await this.getUserPrefix();
    return `${prefix}recentSolvesLastUpdated`;
  },

  /** Build namespaced extension last-timestamp key. */
  async nsExtensionLastTsKey(): Promise<string> {
    const prefix = await this.getUserPrefix();
    return `${prefix}lastTimestamp`;
  },

  /** Build namespaced profile key. */
  async nsProfileKey(profileId: string): Promise<string> {
    const prefix = await this.getUserPrefix();
    return `${prefix}${profileId}`;
  },

  /** Build namespaced active-profile key. */
  async nsActiveProfileKey(): Promise<string> {
    const prefix = await this.getUserPrefix();
    return `${prefix}active`;
  },

  /* ----------------------------------------------------------------------------
      Public API methods
  ---------------------------------------------------------------------------- */

  // User identity
  async getUsername(): Promise<string | undefined> {
    // Return cached value if available
    if (this._usernameCache !== null) {
      return this._usernameCache;
    }

    // Load from database and cache
    const username = await (await dbPromise).get('leetcode-username', 'username');
    this._usernameCache = username;
    return username;
  },
  async setUsername(username: string): Promise<string> {
    // Update cache when setting new username
    this._usernameCache = username;
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
  async setProblemListLastUpdated(epochMs: number): Promise<string> {
    return (await dbPromise).put('problem-metadata', epochMs, 'lastUpdated');
  },
  async getProblemListLastUpdated(): Promise<number | undefined> {
    return (await dbPromise).get('problem-metadata', 'lastUpdated');
  },

  // Solves (per user)
  async getAllSolves(): Promise<Solve[]> {
    const username = await this.getUsername();
    if (!username) return [];

    return this.withTransaction(
      'solves',
      async (tx) => {
        const store = tx.objectStore('solves') as any;
        const index = store.index('username');
        const results = await index.getAll(username);
        return results;
      },
      'readonly',
    );
  },

  async getAllSolvesSorted(): Promise<Solve[]> {
    const solves = await this.getAllSolves();
    return solves.sort((a, b) => b.timestamp - a.timestamp);
  },

  async getSolve(slug: string, timestamp: number): Promise<Solve | undefined> {
    const nsKey = await this.nsSolveKey(slug, timestamp);
    return (await dbPromise).get('solves', nsKey);
  },

  async saveSolve(solve: Solve): Promise<string> {
    const key = await this.nsSolveKey(solve.slug, solve.timestamp);
    const username = await this.getUsername();

    // Ensure username is set for indexing
    const solveWithUsername = { ...solve, username };

    return this.withTransaction('solves', async (tx) => {
      const store = tx.objectStore('solves');
      const res = await store.put!(solveWithUsername, key);
      return res as string;
    });
  },

  async clearSolves(): Promise<void> {
    const username = await this.getUsername();
    if (!username) return;

    return this.withTransaction('solves', async (tx) => {
      const store = tx.objectStore('solves') as any;
      const index = store.index('username');
      const keys = await index.getAllKeys(username);
      for (const key of keys) {
        await store.delete!(key);
      }
    });
  },

  // Per-user recent-solves metadata
  async setRecentSolvesLastUpdated(epochMs: number): Promise<string> {
    const key = await this.nsRecentSolvesKey();
    return (await dbPromise).put('solves-metadata', epochMs, key);
  },
  async getRecentSolvesLastUpdated(): Promise<number | undefined> {
    const key = await this.nsRecentSolvesKey();
    return (await dbPromise).get('solves-metadata', key);
  },

  // Goal profiles (per user)
  async getGoalProfile(id: string): Promise<GoalProfile | undefined> {
    const ns = await this.nsProfileKey(id);
    return (await dbPromise).get('goal-profiles', ns);
  },

  async saveGoalProfile(profile: GoalProfile): Promise<string> {
    const key = await this.nsProfileKey(profile.id);
    const username = await this.getUsername();

    // Ensure username is set for indexing
    const profileWithUsername = { ...profile, username };

    return (await dbPromise).put('goal-profiles', profileWithUsername, key);
  },

  async deleteGoalProfile(id: string): Promise<void> {
    const key = await this.nsProfileKey(id);
    await (await dbPromise).delete('goal-profiles', key);
  },

  async clearGoalProfiles(): Promise<void> {
    const username = await this.getUsername();
    if (!username) return;

    return this.withTransaction('goal-profiles', async (tx) => {
      const store = tx.objectStore('goal-profiles') as any;
      const index = store.index('username');
      const keys = await index.getAllKeys(username);
      for (const key of keys) {
        await store.delete!(key);
      }
    });
  },

  async setActiveGoalProfile(id: string): Promise<string> {
    const key = await this.nsActiveProfileKey();
    return (await dbPromise).put('active-goal-profile', id, key);
  },

  async getActiveGoalProfileId(): Promise<string | undefined> {
    const key = await this.nsActiveProfileKey();
    return (await dbPromise).get('active-goal-profile', key);
  },

  async getAllGoalProfiles(): Promise<GoalProfile[]> {
    const username = await this.getUsername();
    if (!username) return [];

    return this.withTransaction(
      'goal-profiles',
      async (tx) => {
        const store = tx.objectStore('goal-profiles') as any;
        const index = store.index('username');
        const results = await index.getAll(username);
        return results;
      },
      'readonly',
    );
  },

  // Extension sync (per user)
  async getExtensionLastTimestamp(): Promise<number> {
    const key = await this.nsExtensionLastTsKey();
    const v = await (await dbPromise).get('extension-sync', key);
    return v !== undefined ? v : 0;
  },

  async setExtensionLastTimestamp(ts: number): Promise<string> {
    const key = await this.nsExtensionLastTsKey();
    return (await dbPromise).put('extension-sync', ts, key);
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
    callback: (tx: IDBPTransaction<LeetTrackerDB, any, any>) => Promise<T>,
    mode: IDBTransactionMode = 'readwrite',
  ): Promise<T> {
    const tx = await this.transaction(storeNames, mode);
    return callback(tx as any);
  },
};
