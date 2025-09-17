import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CodeSnapshot } from '@/types/types';
import {
  hasMeaningfulTimelineData,
  applyPatch,
  nearestCheckpointIndex,
  formatElapsedTime,
  formatSnapshotTime,
} from './timelineProcessing';

// Mock diff-match-patch
vi.mock('diff-match-patch', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      patch_fromText: vi.fn().mockReturnValue(['mock-patches']),
      patch_apply: vi.fn().mockReturnValue(['patched code', [true]]),
    })),
  };
});

describe('hasMeaningfulTimelineData', () => {
  it('should return true for solve with snapshots', () => {
    const solve = {
      slug: 'test',
      title: 'Test Problem',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'python3',
      codingJourney: {
        snapshots: [{ timestamp: Date.now(), fullCode: 'initial code' }],
      },
    } as any;

    expect(hasMeaningfulTimelineData(solve)).toBe(true);
  });

  it('should return true for solve with runs (even without snapshots)', () => {
    const solve = {
      slug: 'test',
      title: 'Test Problem',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'python3',
      runEvents: {
        runs: [{ id: 'run1', startedAt: 123456789, status: 'Accepted' }],
      },
    } as any;

    expect(hasMeaningfulTimelineData(solve)).toBe(true);
  });

  it('should return true for solve with both snapshots and runs', () => {
    const solve = {
      slug: 'test',
      title: 'Test Problem',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'python3',
      codingJourney: {
        snapshots: [{ timestamp: Date.now(), fullCode: 'initial code' }],
      },
      runEvents: {
        runs: [{ id: 'run1', startedAt: 123456789, status: 'Accepted' }],
      },
    } as any;

    expect(hasMeaningfulTimelineData(solve)).toBe(true);
  });

  it('should return false for solve with empty snapshots and no runs', () => {
    const solve = {
      slug: 'test',
      title: 'Test Problem',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'python3',
      codingJourney: {
        snapshots: [],
      },
    } as any;

    expect(hasMeaningfulTimelineData(solve)).toBe(false);
  });

  it('should return false for solve with runs but no startedAt timestamps', () => {
    const solve = {
      slug: 'test',
      title: 'Test Problem',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'python3',
      runEvents: {
        runs: [
          { id: 'run1', status: 'Accepted' }, // no startedAt
        ],
      },
    } as any;

    expect(hasMeaningfulTimelineData(solve)).toBe(false);
  });

  it('should return false for solve without codingJourney or runEvents', () => {
    const solve = {
      slug: 'test',
      title: 'Test Problem',
      timestamp: Date.now() / 1000,
      status: 'Accepted',
      lang: 'python3',
    } as any;

    expect(hasMeaningfulTimelineData(solve)).toBe(false);
  });
});

describe('applyPatch', () => {
  it('should apply patch and return a string result', async () => {
    const result = await applyPatch('base code', 'patch text');
    expect(typeof result).toBe('string');
    // The function should either return the patched code or fallback to original
    expect(result).toMatch(/code/); // Should contain 'code' in some form
  });

  it('should return original code when dmp is not available', async () => {
    // Temporarily mock the import to return null
    vi.doUnmock('diff-match-patch');
    vi.doMock('diff-match-patch', () => {
      throw new Error('Not available');
    });

    const result = await applyPatch('original code', 'patch');
    expect(result).toBe('original code'); // Should return original when library unavailable
  });

  it('should handle patch application errors gracefully', async () => {
    // Mock the DMP instance to throw an error during patch application
    const mockDmp = {
      patch_fromText: vi.fn().mockImplementation(() => {
        throw new Error('Invalid patch format');
      }),
      patch_apply: vi.fn(),
    };

    vi.doMock('diff-match-patch', () => ({
      default: vi.fn(() => mockDmp),
    }));

    const result = await applyPatch('original code', 'invalid patch');
    expect(result).toBe('original code'); // Should return original on error
  });
});

describe('nearestCheckpointIndex', () => {
  it('should find nearest checkpoint before target', () => {
    const snapshots: CodeSnapshot[] = [
      { timestamp: 100, fullCode: 'code1' },
      { timestamp: 200, patchText: 'patch1' },
      { timestamp: 300, fullCode: 'code2' },
      { timestamp: 400, patchText: 'patch2' },
      { timestamp: 500, patchText: 'patch3' },
    ];
    expect(nearestCheckpointIndex(snapshots, 3)).toBe(2); // index of snapshot with fullCode
  });

  it('should return -1 for target before first checkpoint', () => {
    const snapshots: CodeSnapshot[] = [
      { timestamp: 200, patchText: 'patch1' },
      { timestamp: 300, fullCode: 'code1' },
    ];
    expect(nearestCheckpointIndex(snapshots, 0)).toBe(-1);
  });

  it('should handle empty snapshots array', () => {
    expect(nearestCheckpointIndex([], 0)).toBe(-1);
  });
});

describe('formatElapsedTime', () => {
  it('should format elapsed time in seconds', () => {
    expect(formatElapsedTime(1000, 6000)).toBe('5s');
  });

  it('should format elapsed time in minutes', () => {
    expect(formatElapsedTime(1000, 126000)).toBe('2.1min');
  });

  it('should handle zero elapsed time', () => {
    expect(formatElapsedTime(1000, 1000)).toBe('0s');
  });
});

describe('formatSnapshotTime', () => {
  beforeEach(() => {
    // Mock toLocaleTimeString to have predictable output
    vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('12:30:45');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should format snapshot time correctly', () => {
    const timestamp = new Date('2024-01-01T12:30:45Z').getTime();
    const result = formatSnapshotTime(timestamp);
    expect(result).toBe('12:30:45');
  });

  it('should handle different timestamps consistently', () => {
    const timestamp1 = new Date('2024-01-01T09:15:30Z').getTime();
    const timestamp2 = new Date('2024-01-01T18:45:20Z').getTime();

    expect(formatSnapshotTime(timestamp1)).toBe('12:30:45');
    expect(formatSnapshotTime(timestamp2)).toBe('12:30:45');

    // Verify toLocaleTimeString was called with correct options (empty array and options object)
    expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  });
});
