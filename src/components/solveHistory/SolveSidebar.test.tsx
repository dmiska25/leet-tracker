import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import SolveSidebar from './SolveSidebar';
import type { Solve } from '@/types/types';

/* ------------------------------------------------------------------ */
/*  Helper to quickly build Solve objects                             */
/* ------------------------------------------------------------------ */
function makeSolve(overrides: Partial<Solve> = {}): Solve {
  return {
    slug: 'two-sum',
    title: 'Two Sum',
    timestamp: Math.floor(Date.now() / 1000), // Recent
    status: 'Accepted',
    lang: 'typescript',
    ...overrides,
  } as Solve;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */
describe('<SolveSidebar>', () => {
  const noop = () => {};

  it('shows a score badge when final_score is present', () => {
    const solveWithScore = makeSolve({
      feedback: {
        performance: {
          time_to_solve: 3,
          time_complexity: 'O(n)',
          space_complexity: 'O(1)',
          comments: '',
        },
        code_quality: {
          readability: 4,
          correctness: 5,
          maintainability: 4,
          comments: '',
        },
        summary: {
          final_score: 90,
          comments: '',
        },
      },
    });

    render(
      <SolveSidebar solves={[solveWithScore]} selectedId={null} onSelect={noop} onHide={noop} />,
    );

    expect(screen.getByText(/Score:\s*90/i)).toBeInTheDocument();
    expect(screen.queryByText(/Needs Feedback/i)).not.toBeInTheDocument();
  });

  it('shows the "Needs Feedback” badge when no score is available', () => {
    const solveWithoutScore = makeSolve();

    render(
      <SolveSidebar solves={[solveWithoutScore]} selectedId={null} onSelect={noop} onHide={noop} />,
    );

    expect(screen.getByText(/Needs Feedback/i)).toBeInTheDocument();
  });

  it('renders grouped solves and handles expansion', () => {
    const now = Math.floor(Date.now() / 1000);
    const later = makeSolve({
      slug: 'group-test',
      title: 'Grouped Problem',
      timestamp: now,
      status: 'Accepted',
    });
    const earlier = makeSolve({
      slug: 'group-test',
      title: 'Grouped Problem',
      timestamp: now - 3600, // 1 hour gap -> same session
      status: 'Rejected',
    });

    const { container } = render(
      <SolveSidebar solves={[later, earlier]} selectedId={null} onSelect={noop} onHide={noop} />,
    );

    // Initial state: 1 visible header for the group
    const titles = screen.getAllByText('Grouped Problem');
    expect(titles.length).toBe(1);

    // Head shows status
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.queryByText('Rejected')).not.toBeInTheDocument();

    // Toggle expansion
    const toggleBtn = container.querySelector('button.h-6.w-6');
    expect(toggleBtn).toBeInTheDocument();
    if (toggleBtn) fireEvent.click(toggleBtn);

    // Now shows child
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });

  it('renders distinct sessions separately', () => {
    const now = Math.floor(Date.now() / 1000);
    const s1 = makeSolve({ slug: 'p1', title: 'Problem 1', timestamp: now });
    const s2 = makeSolve({ slug: 'p2', title: 'Problem 2', timestamp: now });

    render(<SolveSidebar solves={[s1, s2]} selectedId={null} onSelect={noop} onHide={noop} />);

    expect(screen.getByText('Problem 1')).toBeInTheDocument();
    expect(screen.getByText('Problem 2')).toBeInTheDocument();
  });
});
