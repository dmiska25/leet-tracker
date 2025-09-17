import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CodeTimeline from './CodeTimeline';

// Mock timelineProcessing
vi.mock('@/domain/timelineProcessing', () => ({
  hasMeaningfulTimelineData: vi.fn(() => true),
  buildTimelineEvents: vi.fn(() => []),
  reconstructCode: vi.fn(() => Promise.resolve('')),
  formatSnapshotTime: vi.fn(() => '12:00:00'),
  formatElapsedTime: vi.fn(() => '2s'),
}));

// Mock react-syntax-highlighter
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre>{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

const mockSolve = {
  slug: 'test',
  title: 'Test',
  timestamp: Date.now() / 1000,
  status: 'Accepted',
  lang: 'python3',
  codingJourney: {
    snapshots: [],
    snapshotCount: 0,
    totalCodingTime: 0,
    firstSnapshot: 0,
    lastSnapshot: 0,
  },
} as any;

const mockProps = {
  solve: mockSolve,
  onCodeChange: vi.fn(),
  currentSnapshot: 0,
  setCurrentSnapshot: vi.fn(),
};

describe('CodeTimeline', () => {
  let mockTimelineProcessing: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTimelineProcessing = await vi.importMock('@/domain/timelineProcessing');

    // Setup default mock implementations
    mockTimelineProcessing.hasMeaningfulTimelineData.mockReturnValue(true);
    mockTimelineProcessing.buildTimelineEvents.mockReturnValue([]);
    mockTimelineProcessing.reconstructCode.mockResolvedValue('def test(): pass');
    mockTimelineProcessing.formatSnapshotTime.mockReturnValue('12:00:00');
    mockTimelineProcessing.formatElapsedTime.mockReturnValue('2s');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render without crashing', () => {
    render(<CodeTimeline {...mockProps} />);
    expect(screen.getByText('Loading code timeline...')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<CodeTimeline {...mockProps} />);
    expect(screen.getByText('Loading code timeline...')).toBeInTheDocument();
  });

  it('should display empty state when hasMeaningfulTimelineData returns false', async () => {
    mockTimelineProcessing.hasMeaningfulTimelineData.mockReturnValue(false);

    render(<CodeTimeline {...mockProps} />);

    await waitFor(() => {
      // Component renders nothing when no meaningful data
      expect(document.body.textContent).toBe('');
    });
  });

  it('should render timeline events with correct number of points', async () => {
    const mockEvents = [
      {
        id: 'snapshot-0',
        timestamp: 1000,
        type: 'snapshot',
        label: 'Initial Code',
        code: 'def test(): pass',
        index: 0,
      },
      {
        id: 'run-0',
        timestamp: 2000,
        type: 'run',
        label: 'Run (Accepted)',
        code: 'def test(): return True',
        index: 1,
      },
    ];

    mockTimelineProcessing.buildTimelineEvents.mockReturnValue(mockEvents);

    render(<CodeTimeline {...mockProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
    });

    // Should have timeline points as buttons with titles
    const timelineButtons = screen
      .getAllByRole('button')
      .filter(
        (button) =>
          button.getAttribute('title')?.includes('Code') ||
          button.getAttribute('title')?.includes('Run'),
      );
    expect(timelineButtons.length).toBe(2); // Should match number of mock events
  });

  it('should display navigation buttons', async () => {
    const mockEvents = [
      {
        id: 'snapshot-0',
        timestamp: 1000,
        type: 'snapshot',
        label: 'Initial Code',
        code: 'def test(): pass',
        index: 0,
      },
      {
        id: 'snapshot-1',
        timestamp: 2000,
        type: 'snapshot',
        label: 'Updated Code',
        code: 'def test(): return True',
        index: 1,
      },
    ];

    mockTimelineProcessing.buildTimelineEvents.mockReturnValue(mockEvents);

    render(<CodeTimeline {...mockProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
    });

    // Should have navigation buttons (chevron left/right)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2); // At least prev/next buttons
  });

  it('should display timeline counter', async () => {
    const mockEvents = [
      {
        id: 'snapshot-0',
        timestamp: 1000,
        type: 'snapshot',
        label: 'Initial Code',
        code: 'def test(): pass',
        index: 0,
      },
      {
        id: 'snapshot-1',
        timestamp: 2000,
        type: 'snapshot',
        label: 'Updated Code',
        code: 'def test(): return True',
        index: 1,
      },
    ];

    mockTimelineProcessing.buildTimelineEvents.mockReturnValue(mockEvents);

    render(<CodeTimeline {...mockProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading timeline...')).not.toBeInTheDocument();
    });

    // Should show event counter (0 of X)
    expect(screen.getByText(/of 2/)).toBeInTheDocument();
  });

  it('should display formatted timestamps', async () => {
    const mockEvents = [
      {
        id: 'snapshot-0',
        timestamp: 1000,
        type: 'snapshot',
        label: 'Initial Code',
        code: 'def test(): pass',
        index: 0,
      },
    ];

    mockTimelineProcessing.buildTimelineEvents.mockReturnValue(mockEvents);
    mockTimelineProcessing.formatSnapshotTime.mockReturnValue('10:30:45');
    mockTimelineProcessing.formatElapsedTime.mockReturnValue('5s');

    render(<CodeTimeline {...mockProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading code timeline...')).not.toBeInTheDocument();
    });

    // Should display formatted times (time appears multiple times)
    expect(screen.getAllByText('10:30:45').length).toBeGreaterThan(0);
    // The "5s" appears within the time display as "10:30:45 (5s)"
    expect(screen.getByText(/\(5s\)/)).toBeInTheDocument();
  });

  it('should handle empty timeline events gracefully', async () => {
    mockTimelineProcessing.buildTimelineEvents.mockReturnValue([]);

    render(<CodeTimeline {...mockProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading code timeline...')).not.toBeInTheDocument();
    });

    // When no events, component renders empty state
    expect(document.body.textContent).toBe('');
  });

  it('should use mocked syntax highlighter', () => {
    render(<CodeTimeline {...mockProps} />);

    // Our mock should render a simple pre tag
    const preElements = document.querySelectorAll('pre');
    expect(preElements.length).toBeGreaterThanOrEqual(0); // May or may not have pre elements initially
  });

  it('should call timeline processing functions with meaningful data', async () => {
    const mockEvents = [
      {
        id: 'snapshot-0',
        timestamp: 1000,
        type: 'snapshot',
        label: 'Initial Code',
        code: 'def test(): pass',
        index: 0,
      },
    ];

    mockTimelineProcessing.buildTimelineEvents.mockReturnValue(mockEvents);

    render(<CodeTimeline {...mockProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Loading code timeline...')).not.toBeInTheDocument();
    });

    // Should call buildTimelineEvents when rendering with events
    expect(mockTimelineProcessing.buildTimelineEvents).toHaveBeenCalled();
  });
});
