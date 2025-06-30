import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

import SolveHistory from './SolveHistory';
import { db } from '@/storage/db';
import { Solve, Difficulty, Category } from '@/types/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const now = Math.floor(Date.now() / 1000);
const makeSolve = (title: string, ts: number): Solve => ({
  slug: title.toLowerCase().replace(/\s+/g, '-'),
  title,
  timestamp: ts,
  status: 'Accepted',
  lang: 'ts',
  difficulty: Difficulty.Easy,
  tags: ['Array'] as Category[],
});

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */
vi.mock('@/storage/db');

describe('<SolveHistory>', () => {
  const solves = [makeSolve('Problem One', now), makeSolve('Problem Two', now - 1000)];

  beforeEach(() => {
    vi.mocked(db.getAllSolvesSorted).mockResolvedValue([...solves]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates detail pane when a different solve is clicked', async () => {
    const user = userEvent.setup();
    render(<SolveHistory />);

    /* Detail pane initially shows most-recent solve */
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Problem One', level: 3 })).toBeInTheDocument();
    });

    /* Click the second item ("Problem Two") in the sidebar (h4 heading) */
    await user.click(screen.getByRole('heading', { name: 'Problem Two', level: 4 }));

    /* Detail pane should update to show "Problem Two" (h3 heading) */
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Problem Two', level: 3 })).toBeInTheDocument();
    });
  });

  it('displays loading state when data is being fetched', async () => {
    vi.mocked(db.getAllSolvesSorted).mockResolvedValue([]);
    render(<SolveHistory />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('displays "No solves found" when there are no solves', async () => {
    vi.mocked(db.getAllSolvesSorted).mockResolvedValue([]);
    render(<SolveHistory />);

    await waitFor(() => {
      expect(screen.getByText('No solves found.')).toBeInTheDocument();
    });
  });

  it('renders the sidebar with all solves', async () => {
    render(<SolveHistory />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Problem One', level: 4 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Problem Two', level: 4 })).toBeInTheDocument();
    });
  });

  it('handles mobile view switching between listing and details', async () => {
    global.innerWidth = 500; // Simulate mobile screen width
    global.dispatchEvent(new Event('resize'));
    render(<SolveHistory />);

    /* Initially in listing view */
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Problem One', level: 4 })).toBeInTheDocument();
    });

    /* Click on a solve to switch to details view */
    const user = userEvent.setup();
    await user.click(screen.getByRole('heading', { name: 'Problem One', level: 4 }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Problem One', level: 3 })).toBeInTheDocument();
    });
  });

  it('refreshes solves when a solve is saved', async () => {
    const user = userEvent.setup();
    render(<SolveHistory />);

    /* Simulate the initial state where the most recent solve is displayed */
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Problem One', level: 3 })).toBeInTheDocument();
    });

    /* Mock the updated solves list to include a new solve */
    vi.mocked(db.getAllSolvesSorted).mockResolvedValue([
      ...solves,
      makeSolve('Problem Three', now - 2000),
    ]);

    /* Simulate selecting the first solve to open SolveDetail */
    await user.click(screen.getByRole('heading', { name: 'Problem One', level: 4 }));

    /* Simulate entering edit mode for Solve Details */
    const addDetailsButton = screen.getByRole('button', { name: /add details/i });
    await user.click(addDetailsButton);

    /* Simulate saving changes */
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    /* Wait for the refresh to complete */
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Problem Three', level: 4 })).toBeInTheDocument();
    });
  });
});
