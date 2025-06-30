import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

import SolveDetail from './SolveDetail';
import { db } from '@/storage/db';
import { Difficulty, Category, Solve } from '@/types/types';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

// Spy‑able toast helper
const toastMock = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  useToast: () => toastMock,
}));

// Mock database saveSolve function
vi.mock('@/storage/db');
const saveSolve = vi.mocked(db.saveSolve);

const baseSolve: Solve = {
  slug: 'two-sum',
  title: 'Two Sum',
  timestamp: Math.floor(Date.now() / 1000),
  status: 'Accepted',
  lang: 'typescript',
  code: 'function twoSum() {}',
  difficulty: Difficulty.Easy,
  tags: ['Array'] as Category[],
};

describe('<SolveDetail>', () => {
  const onSaved = vi.fn();
  const onShowList = vi.fn();

  beforeEach(() => {
    saveSolve.mockResolvedValue('');
    onSaved.mockClear();
    toastMock.mockClear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('allows editing and saving submission code', async () => {
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={baseSolve}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Enter code edit mode
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);

    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'new code');

    // Save changes
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveSolve).toHaveBeenCalledWith(expect.objectContaining({ code: 'new code' }));
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('shows an error toast if code is empty when saving', async () => {
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={baseSolve}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Enter code edit mode
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);

    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);

    // Attempt to save empty code
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Code cannot be empty.', 'error');
      expect(saveSolve).not.toHaveBeenCalled();
    });
  });

  it('handles save failure gracefully for code', async () => {
    saveSolve.mockRejectedValue(new Error('Save failed'));
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={baseSolve}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Enter code edit mode
    const editBtns = screen.getAllByRole('button', { name: /edit/i });
    await user.click(editBtns[0]);

    const textarea = await screen.findByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'new code');

    // Attempt to save
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Failed to save code. Please try again.', 'error');
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('allows adding solve details', async () => {
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={{ ...baseSolve, timeUsed: undefined, usedHints: undefined, notes: undefined }}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Open details edit
    await user.click(screen.getByRole('button', { name: /add details/i }));

    const timeInput = screen.getByLabelText(/time spent/i);
    await user.clear(timeInput);
    await user.type(timeInput, '10'); // minutes

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveSolve).toHaveBeenCalledWith(expect.objectContaining({ timeUsed: 600 }));
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('validates solve time input when adding details', async () => {
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={{ ...baseSolve, timeUsed: undefined, usedHints: undefined, notes: undefined }}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Open details edit
    await user.click(screen.getByRole('button', { name: /add details/i }));

    const timeInput = screen.getByLabelText(/time spent/i);
    await user.clear(timeInput);
    await user.type(timeInput, '-10'); // Invalid negative time

    // Attempt to save
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Solve time must be a non-negative number.', 'error');
      expect(saveSolve).not.toHaveBeenCalled();
    });
  });

  it('handles save failure gracefully for solve details', async () => {
    saveSolve.mockRejectedValue(new Error('Save failed'));
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={{ ...baseSolve, timeUsed: undefined, usedHints: undefined, notes: undefined }}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Open details edit
    await user.click(screen.getByRole('button', { name: /add details/i }));

    const timeInput = screen.getByLabelText(/time spent/i);
    await user.clear(timeInput);
    await user.type(timeInput, '10'); // Valid time

    // Attempt to save
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Failed to save details. Please try again.', 'error');
      expect(onSaved).not.toHaveBeenCalled();
    });
  });

  it('allows adding feedback with final score', async () => {
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={{
          ...baseSolve,
        }}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Open feedback edit
    await user.click(screen.getByRole('button', { name: /add feedback/i }));

    // Set performance feedback
    const timeToSolveInput = screen.getByLabelText(/time to solve \(1-5\)/i);
    await user.clear(timeToSolveInput);
    await user.type(timeToSolveInput, '3'); // Valid value

    const timeComplexityInput = screen.getByLabelText(/time complexity/i);
    await user.clear(timeComplexityInput);
    await user.type(timeComplexityInput, 'O(n)');

    const spaceComplexityInput = screen.getByLabelText(/space complexity/i);
    await user.clear(spaceComplexityInput);
    await user.type(spaceComplexityInput, 'O(1)');

    const performanceCommentsInput = screen.getByLabelText(/performance comments/i);
    await user.clear(performanceCommentsInput);
    await user.type(performanceCommentsInput, 'Good performance overall.');

    // Set code quality feedback
    const readabilityInput = screen.getByLabelText(/readability \(1-5\)/i);
    await user.clear(readabilityInput);
    await user.type(readabilityInput, '4'); // Valid value

    const correctnessInput = screen.getByLabelText(/correctness \(1-5\)/i);
    await user.clear(correctnessInput);
    await user.type(correctnessInput, '5'); // Valid value

    const maintainabilityInput = screen.getByLabelText(/maintainability \(1-5\)/i);
    await user.clear(maintainabilityInput);
    await user.type(maintainabilityInput, '3'); // Valid value

    const codeQualityCommentsInput = screen.getByLabelText(/code quality comments/i);
    await user.clear(codeQualityCommentsInput);
    await user.type(codeQualityCommentsInput, 'Code is clean and maintainable.');

    // Set summary feedback
    const finalScoreInput = screen.getByLabelText(/final score \(1-100\)/i);
    await user.clear(finalScoreInput);
    await user.type(finalScoreInput, '85'); // Valid value

    const summaryCommentsInput = screen.getByLabelText(/summary comments/i);
    await user.clear(summaryCommentsInput);
    await user.type(summaryCommentsInput, 'Great solution overall.');

    // Save feedback
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(saveSolve).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback: expect.objectContaining({
            performance: expect.objectContaining({
              time_to_solve: 3,
              time_complexity: 'O(n)',
              space_complexity: 'O(1)',
              comments: 'Good performance overall.',
            }),
            code_quality: expect.objectContaining({
              readability: 4,
              correctness: 5,
              maintainability: 3,
              comments: 'Code is clean and maintainable.',
            }),
            summary: expect.objectContaining({
              final_score: 85,
              comments: 'Great solution overall.',
            }),
          }),
        }),
      );
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('validates feedback input when adding feedback', async () => {
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={{
          ...baseSolve,
        }}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Open feedback edit
    await user.click(screen.getByRole('button', { name: /add feedback/i }));

    const scoreInput = screen.getByLabelText(/final score/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, '150'); // Invalid score

    // Attempt to save
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Numeric ratings are out of range.', 'error');
      expect(saveSolve).not.toHaveBeenCalled();
    });
  });

  it('handles save failure gracefully for feedback', async () => {
    saveSolve.mockRejectedValue(new Error('Save failed'));
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={{
          ...baseSolve,
          feedback: {
            performance: {
              time_to_solve: 3,
              time_complexity: '',
              space_complexity: '',
              comments: '',
            },
            code_quality: { readability: 3, correctness: 3, maintainability: 3, comments: '' },
            summary: { final_score: 1, comments: '' }, // Set a valid initial value
          },
        }}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Open feedback edit
    await user.click(screen.getByRole('button', { name: /edit feedback/i }));

    const scoreInput = screen.getByLabelText(/final score/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, '85'); // Valid score

    // Attempt to save
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Failed to save feedback. Please try again.', 'error');
      expect(onSaved).not.toHaveBeenCalled();
    });
  });
});
