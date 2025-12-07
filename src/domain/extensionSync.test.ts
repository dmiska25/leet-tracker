import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../storage/db';
import { getManifestSince, getChunk, ExtensionUnavailable } from '../api/extensionBridge';
import { syncFromExtension } from './extensionSync';
import { Difficulty, Problem, Solve, HINT_TYPES } from '../types/types';

vi.mock('../storage/db');
vi.mock('../api/extensionBridge');

const mockProblems: Problem[] = [
  {
    slug: 'p1',
    title: 'Problem 1',
    tags: ['Array'],
    description: 'Description 1',
    difficulty: Difficulty.Easy,
    popularity: 0.8,
    isPaid: false,
    isFundamental: true,
    createdAt: 0,
  },
];

const mockSolves = [
  {
    titleSlug: 'p1',
    timestamp: 1234567890,
    statusDisplay: 'Accepted',
    lang: 'ts',
    solveTime: 120,
    codeDetail: { code: 'console.log("solution");' },
    problemDescription: 'Updated description',
  },
];

describe('syncFromExtension', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    /* db mocks */
    vi.mocked(db.getExtensionLastTimestamp).mockResolvedValue(0);
    vi.mocked(db.getProblem).mockResolvedValue(mockProblems[0]);
    vi.mocked(db.getSolve).mockResolvedValue(undefined);
    vi.mocked(db.addOrUpdateProblem).mockResolvedValue('');
    vi.mocked(db.saveSolve).mockResolvedValue('');
    vi.mocked(db.setExtensionLastTimestamp).mockResolvedValue('');

    /* extensionBridge mocks */
    vi.mocked(getManifestSince).mockResolvedValue({
      chunks: [{ index: 0, from: 0, to: 1234567890 }],
      total: undefined,
      totalSynced: undefined,
    });
    vi.mocked(getChunk).mockResolvedValue(mockSolves);
  });

  it('syncs new solves and updates problems', async () => {
    const added = await syncFromExtension('testuser');

    expect(added).toBe(1); // One solve added
    expect(db.getExtensionLastTimestamp).toHaveBeenCalled();
    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).toHaveBeenCalledWith('testuser', 0);
    expect(db.addOrUpdateProblem).toHaveBeenCalledWith({
      ...mockProblems[0],
      description: 'Updated description',
    });
    expect(db.saveSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'p1',
        title: 'p1',
        timestamp: 1234567890,
        status: 'Accepted',
        lang: 'ts',
        timeUsed: 120,
        code: 'console.log("solution");',
        difficulty: Difficulty.Easy,
        tags: ['Array'],
        usedHints: 'none', // Defaults to 'none' when not provided
      }),
    );
    expect(db.setExtensionLastTimestamp).toHaveBeenCalledWith(1234567890);
  });

  it('handles no new solves gracefully', async () => {
    vi.mocked(getManifestSince).mockResolvedValue({
      chunks: [],
      total: undefined,
      totalSynced: undefined,
    }); // No new chunks

    const added = await syncFromExtension('testuser');

    expect(added).toBe(0);
    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).not.toHaveBeenCalled();
    expect(db.saveSolve).not.toHaveBeenCalled();
  });

  it('throws ExtensionUnavailable error when extension is unavailable', async () => {
    vi.mocked(getManifestSince).mockRejectedValue(new ExtensionUnavailable());

    await expect(syncFromExtension('testuser')).rejects.toThrow(ExtensionUnavailable);

    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).not.toHaveBeenCalled();
    expect(db.saveSolve).not.toHaveBeenCalled();
  });

  it('handles unexpected errors during sync', async () => {
    vi.mocked(getManifestSince).mockRejectedValue(new Error('Unexpected error'));

    await expect(syncFromExtension('testuser')).rejects.toThrow('Unexpected error');

    expect(getManifestSince).toHaveBeenCalledWith('testuser', 0);
    expect(getChunk).not.toHaveBeenCalled();
    expect(db.saveSolve).not.toHaveBeenCalled();
  });

  it('preserves existing timeUsed, code, and tags', async () => {
    const existingSolve: Solve = {
      slug: 'p1',
      title: 'Problem 1',
      timestamp: 1234567890,
      status: 'Accepted',
      lang: 'ts',
      timeUsed: 300, // Existing timeUsed
      code: 'console.log("existing solution");', // Existing code
      difficulty: Difficulty.Easy,
      tags: ['Greedy'], // Existing tags
    };

    vi.mocked(db.getSolve).mockResolvedValue(existingSolve);

    const added = await syncFromExtension('testuser');

    expect(added).toBe(1); // One solve added
    expect(db.saveSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'p1',
        title: 'p1',
        timestamp: 1234567890,
        status: 'Accepted',
        lang: 'ts',
        timeUsed: 300, // Preserved timeUsed
        code: 'console.log("existing solution");', // Preserved code
        difficulty: Difficulty.Easy,
        tags: ['Greedy'], // Preserved tags
      }),
    );
  });

  it('ingests enriched fields from the extension (problemDescription object, submission details, journey, runs)', async () => {
    // Override chunk data with enriched payload
    const enrichedTs = 1234567891;
    const enrichedSolve = {
      id: '99999',
      titleSlug: 'p1',
      timestamp: enrichedTs,
      statusDisplay: 'Accepted',
      lang: 'ts',
      // prefer raw.code over codeDetail.code
      code: 'print(42)',
      codeDetail: { code: 'print("legacy")' },
      solveTime: 42,
      // problemDescription may be an object { content }
      problemDescription: { questionId: '123', content: '<p>HTML</p>' },
      problemNote: '<p>note</p>',
      submissionDetails: {
        runtime: 12,
        memory: 34,
        runtimeDisplay: '12 ms',
        memoryDisplay: '34 MB',
        totalCorrect: 10,
        totalTestcases: 10,
      },
      // Injected via inject_webapp.js
      codingJourney: {
        snapshotCount: 2,
        totalCodingTime: 3000,
        firstSnapshot: 1700000000000,
        lastSnapshot: 1700000003000,
        hasDetailedJourney: true,
        snapshots: [
          { timestamp: 1700000000000, fullCode: 'a' },
          { timestamp: 1700000003000, patchText: '@@ -1,1 +1,1 @@' },
        ],
      },
      runEvents: {
        count: 1,
        firstRun: 1700000001000,
        lastRun: 1700000002000,
        hasDetailedRuns: true,
        runs: [
          {
            id: 'r1',
            startedAt: 1700000001000,
            statusMsg: 'Accepted',
            totalCorrect: 10,
            totalTestcases: 10,
            runtimeError: null,
            compareResult: null,
            runtime: '12 ms',
            memory: '10 MB',
          },
        ],
        _window: { startMs: 1700000000000, endMs: 1700000003000 },
      },
    };

    vi.mocked(getChunk).mockResolvedValue([enrichedSolve]);

    const added = await syncFromExtension('testuser');
    expect(added).toBe(1);

    // Problem description updated from object.content
    expect(db.addOrUpdateProblem).toHaveBeenCalledWith(
      expect.objectContaining({
        ...mockProblems[0],
        description: '<p>HTML</p>',
      }),
    );

    // Saved solve contains enriched fields
    expect(db.saveSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'p1',
        title: 'p1',
        timestamp: enrichedTs,
        status: 'Accepted',
        lang: 'ts',
        submissionId: '99999',
        timeUsed: 42,
        code: 'print(42)',
        problemNote: '<p>note</p>',
        submissionDetails: expect.objectContaining({
          runtime: 12,
          memory: 34,
          totalCorrect: 10,
          totalTestcases: 10,
        }),
        codingJourney: expect.objectContaining({
          snapshotCount: 2,
          totalCodingTime: 3000,
        }),
        runEvents: expect.objectContaining({
          count: 1,
          hasDetailedRuns: true,
        }),
      }),
    );

    // Newest timestamp should be updated
    expect(db.setExtensionLastTimestamp).toHaveBeenCalledWith(enrichedTs);
  });

  it('ingests usedHints when provided with valid HintType value', async () => {
    const solveWithHints = {
      titleSlug: 'p1',
      timestamp: 1234567892,
      statusDisplay: 'Accepted',
      lang: 'ts',
      usedHints: 'leetcode_hint', // Valid HintType
    };

    vi.mocked(getChunk).mockResolvedValue([solveWithHints]);

    const added = await syncFromExtension('testuser');
    expect(added).toBe(1);

    expect(db.saveSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        usedHints: 'leetcode_hint',
      }),
    );
  });

  it('defaults to none when value is invalid and no existing value', async () => {
    const solveWithInvalidHints = {
      titleSlug: 'p1',
      timestamp: 1234567893,
      statusDisplay: 'Accepted',
      lang: 'ts',
      usedHints: 'invalid_hint_type', // Invalid value
    };

    vi.mocked(getChunk).mockResolvedValue([solveWithInvalidHints]);

    const added = await syncFromExtension('testuser');
    expect(added).toBe(1);

    expect(db.saveSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        usedHints: 'none', // Defaults to 'none'
      }),
    );
  });

  it('preserves existing usedHints when not provided in new data', async () => {
    const existingSolve = {
      slug: 'p1',
      title: 'p1',
      timestamp: 1234567894,
      status: 'Accepted',
      lang: 'ts',
      usedHints: 'gpt_help' as const,
    };

    vi.mocked(db.getSolve).mockResolvedValue(existingSolve);

    const solveWithoutHints = {
      titleSlug: 'p1',
      timestamp: 1234567894,
      statusDisplay: 'Accepted',
      lang: 'ts',
      // No usedHints field
    };

    vi.mocked(getChunk).mockResolvedValue([solveWithoutHints]);

    const added = await syncFromExtension('testuser');
    expect(added).toBe(1);

    expect(db.saveSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        usedHints: 'gpt_help', // Preserved from existing
      }),
    );
  });

  it('does not override existing usedHints with new data', async () => {
    const existingSolve = {
      slug: 'p1',
      title: 'p1',
      timestamp: 1234567895,
      status: 'Accepted',
      lang: 'ts',
      usedHints: 'solution_peek' as const,
    };

    vi.mocked(db.getSolve).mockResolvedValue(existingSolve);

    const solveWithDifferentHints = {
      titleSlug: 'p1',
      timestamp: 1234567895,
      statusDisplay: 'Accepted',
      lang: 'ts',
      usedHints: 'leetcode_hint', // Different value
    };

    vi.mocked(getChunk).mockResolvedValue([solveWithDifferentHints]);

    const added = await syncFromExtension('testuser');
    expect(added).toBe(1);

    expect(db.saveSolve).toHaveBeenCalledWith(
      expect.objectContaining({
        usedHints: 'solution_peek', // Preserved from existing, not overridden
      }),
    );
  });

  it('handles all valid HintType values', async () => {
    const hintTypes = [...HINT_TYPES];

    for (const hintType of hintTypes) {
      vi.mocked(getChunk).mockResolvedValue([
        {
          titleSlug: 'p1',
          timestamp: 1234567890 + hintTypes.indexOf(hintType),
          statusDisplay: 'Accepted',
          lang: 'ts',
          usedHints: hintType,
        },
      ]);

      await syncFromExtension('testuser');

      expect(db.saveSolve).toHaveBeenCalledWith(
        expect.objectContaining({
          usedHints: hintType,
        }),
      );
    }
  });
});
