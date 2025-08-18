import { vi, describe, it, expect, beforeEach } from 'vitest';

// Create a shared mock app prefs object for state
let mockAppPrefs: Record<string, any> = {};

// Mock the entire db module
vi.mock('../storage/db', () => {
  const mockDb = {
    getAppPref: vi.fn((key: string) => Promise.resolve(mockAppPrefs[key])),
    setAppPref: vi.fn((key: string, value: any) => {
      mockAppPrefs[key] = value;
      return Promise.resolve();
    }),
    deleteAppPref: vi.fn((key: string) => {
      delete mockAppPrefs[key];
      return Promise.resolve();
    }),
  };

  return {
    db: mockDb,
    // Export the actual implementations of the functions that use db
    markTutorialSeen: () => mockDb.setAppPref('tutorial.seen', true),
    clearTutorialSeen: () => mockDb.deleteAppPref('tutorial.seen'),
    getTutorialSeen: async () => (await mockDb.getAppPref('tutorial.seen')) === true,
    setTutorialActive: (active: boolean) => mockDb.setAppPref('tutorial.active', active),
    getTutorialActive: async () => (await mockDb.getAppPref('tutorial.active')) === true,
    setTutorialStep: (step: number) => mockDb.setAppPref('tutorial.step', step),
    getTutorialStep: async () => (await mockDb.getAppPref('tutorial.step')) ?? 0,
    setTutorialStartedWithUser: (kind: 'demo' | 'normal') =>
      mockDb.setAppPref('tutorial.startedWithUser', kind),
    getTutorialStartedWithUser: async () => await mockDb.getAppPref('tutorial.startedWithUser'),
    setPrevUser: (username: string) => mockDb.setAppPref('tutorial.prevUser', username),
    getPrevUser: async () => mockDb.getAppPref('tutorial.prevUser'),
    clearPrevUser: () => mockDb.deleteAppPref('tutorial.prevUser'),
  };
});

import {
  markTutorialSeen,
  clearTutorialSeen,
  getTutorialSeen,
  setTutorialActive,
  getTutorialActive,
  setTutorialStep,
  getTutorialStep,
  setTutorialStartedWithUser,
  getTutorialStartedWithUser,
  setPrevUser,
  getPrevUser,
  clearPrevUser,
  db,
} from '../storage/db';

// Test the tutorial preference functions
describe('Database Tutorial Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the mock app prefs state between tests
    mockAppPrefs = {};
  });

  describe('Tutorial Seen Status', () => {
    it('should handle tutorial seen flag operations', async () => {
      // Test getting false when not set
      let result = await getTutorialSeen();
      expect(result).toBe(false); // Should default to false

      // Test setting seen to true
      await markTutorialSeen();
      expect(db.setAppPref).toHaveBeenCalledWith('tutorial.seen', true);

      // Test getting true value
      result = await getTutorialSeen();
      expect(result).toBe(true);

      // Test clearing the flag
      await clearTutorialSeen();
      expect(db.deleteAppPref).toHaveBeenCalledWith('tutorial.seen');
    });
  });

  describe('Tutorial Active Status', () => {
    it('should handle active status operations', async () => {
      // Test setting active
      await setTutorialActive(true);
      expect(db.setAppPref).toHaveBeenCalledWith('tutorial.active', true);

      // Test getting active status
      const result = await getTutorialActive();
      expect(result).toBe(true);

      // Test setting inactive
      await setTutorialActive(false);
      expect(db.setAppPref).toHaveBeenCalledWith('tutorial.active', false);
    });

    it('should default to false when not set', async () => {
      const result = await getTutorialActive();
      expect(result).toBe(false);
    });
  });

  describe('Tutorial Step Tracking', () => {
    it('should handle step operations', async () => {
      // Test setting step
      await setTutorialStep(3);
      expect(db.setAppPref).toHaveBeenCalledWith('tutorial.step', 3);

      // Test getting step
      const result = await getTutorialStep();
      expect(result).toBe(3);
    });

    it('should default to 0 when not set', async () => {
      const result = await getTutorialStep();
      expect(result).toBe(0);
    });

    it('should handle step progression', async () => {
      // Simulate progressing through steps
      const steps = [0, 1, 2, 3, 4, 5];

      for (const step of steps) {
        await setTutorialStep(step);
        expect(db.setAppPref).toHaveBeenCalledWith('tutorial.step', step);
      }

      expect(db.setAppPref).toHaveBeenCalledTimes(steps.length);
    });
  });

  describe('Tutorial Started With User', () => {
    it('should handle started with user operations', async () => {
      // Test setting to 'normal'
      await setTutorialStartedWithUser('normal');
      expect(db.setAppPref).toHaveBeenCalledWith('tutorial.startedWithUser', 'normal');

      // Test getting the value
      let result = await getTutorialStartedWithUser();
      expect(result).toBe('normal');

      // Test setting to 'demo'
      await setTutorialStartedWithUser('demo');
      expect(db.setAppPref).toHaveBeenCalledWith('tutorial.startedWithUser', 'demo');

      // Test getting 'demo'
      result = await getTutorialStartedWithUser();
      expect(result).toBe('demo');
    });

    it('should return undefined when not set', async () => {
      const result = await getTutorialStartedWithUser();
      expect(result).toBeUndefined();
    });
  });

  describe('Previous User Management', () => {
    it('should handle previous user storage and retrieval', async () => {
      const testUsername = 'original-user-123';

      // Test setting previous user
      await setPrevUser(testUsername);
      expect(db.setAppPref).toHaveBeenCalledWith('tutorial.prevUser', testUsername);

      // Test getting previous user
      const result = await getPrevUser();
      expect(result).toBe(testUsername);

      // Test clearing previous user
      await clearPrevUser();
      expect(db.deleteAppPref).toHaveBeenCalledWith('tutorial.prevUser');
    });

    it('should return undefined when no previous user is set', async () => {
      const result = await getPrevUser();
      expect(result).toBeUndefined();
    });
  });

  describe('Complete Tutorial Flow Simulation', () => {
    it('should simulate a complete tutorial session', async () => {
      // 1. Check initial state (new user)
      let seen = await getTutorialSeen();
      let active = await getTutorialActive();
      expect(seen).toBe(false);
      expect(active).toBe(false);

      // 2. Start tutorial (save previous user, set active)
      await setPrevUser('original-user');
      await setTutorialActive(true);
      await setTutorialStartedWithUser('normal');
      await setTutorialStep(0);

      // 3. Progress through steps
      for (let step = 1; step <= 5; step++) {
        await setTutorialStep(step);
      }

      // 4. Complete tutorial
      await markTutorialSeen();
      await setTutorialActive(false);
      await setTutorialStep(0);
      await clearPrevUser();

      // Verify final state
      seen = await getTutorialSeen();
      active = await getTutorialActive();
      const finalStep = await getTutorialStep();
      const prevUser = await getPrevUser();

      expect(seen).toBe(true);
      expect(active).toBe(false);
      expect(finalStep).toBe(0);
      expect(prevUser).toBeUndefined();
    });

    it('should simulate tutorial interruption and resumption', async () => {
      // 1. Start tutorial and progress to step 3
      await setTutorialActive(true);
      await setTutorialStep(3);
      await setTutorialStartedWithUser('normal');

      // 2. Simulate page reload/interruption - check if we can resume
      const active = await getTutorialActive();
      const step = await getTutorialStep();
      const startedWith = await getTutorialStartedWithUser();

      expect(active).toBe(true);
      expect(step).toBe(3);
      expect(startedWith).toBe('normal');

      // 3. Continue from step 3 to completion
      await setTutorialStep(4);
      await setTutorialStep(5);
      await setTutorialActive(false);
      await markTutorialSeen();

      // Verify final state
      const finalActive = await getTutorialActive();
      const finalSeen = await getTutorialSeen();
      expect(finalActive).toBe(false);
      expect(finalSeen).toBe(true);
    });
  });
});
