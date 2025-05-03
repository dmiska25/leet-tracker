import { openDB, DBSchema } from 'idb';
import { Problem, Solve, GoalProfile } from '../types/types';

interface LeetTrackerDB extends DBSchema {
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
    value: string; // ISO date
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
  async setProblemListLastUpdated(date: string): Promise<string> {
    return (await dbPromise).put('problem-metadata', date, 'lastUpdated');
  },
  async getProblemListLastUpdated(): Promise<string | undefined> {
    return (await dbPromise).get('problem-metadata', 'lastUpdated');
  },

  // Solves
  async getAllSolves(): Promise<Solve[]> {
    return (await dbPromise).getAll('solves');
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
};
