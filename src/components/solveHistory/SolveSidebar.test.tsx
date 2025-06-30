import { render, screen } from '@testing-library/react';
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
    timestamp: Math.floor(Date.now() / 1000),
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
});
