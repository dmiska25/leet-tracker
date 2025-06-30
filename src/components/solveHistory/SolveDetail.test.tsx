import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

import SolveDetail from './SolveDetail';
import { db } from '@/storage/db';
import { Difficulty, Category, Solve } from '@/types/types';

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
  let updateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    updateSpy = vi.spyOn(db, 'updateSolve').mockResolvedValue('') as any;
    onSaved.mockClear();
  });

  afterEach(() => {
    updateSpy.mockRestore();
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
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ code: 'new code' }));
      expect(onSaved).toHaveBeenCalled();
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
      expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ timeUsed: 600 }));
      expect(onSaved).toHaveBeenCalled();
    });
  });

  it('allows adding feedback with final score', async () => {
    const user = userEvent.setup();
    render(
      <SolveDetail
        solve={{ ...baseSolve, feedback: undefined }}
        onSaved={onSaved}
        onShowList={onShowList}
        showListButton={false}
      />,
    );

    // Open feedback edit
    await user.click(screen.getByRole('button', { name: /add feedback/i }));

    const scoreInput = screen.getByLabelText(/final score/i);
    await user.clear(scoreInput);
    await user.type(scoreInput, '85');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          feedback: expect.objectContaining({
            summary: expect.objectContaining({ final_score: 85 }),
          }),
        }),
      );
      expect(onSaved).toHaveBeenCalled();
    });
  });
});
