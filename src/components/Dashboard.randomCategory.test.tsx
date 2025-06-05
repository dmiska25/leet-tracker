import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, afterEach } from 'vitest';

import Dashboard, { RANDOM_TAG } from './Dashboard';
import { db } from '@/storage/db';
import { getRandomSuggestions, getCategorySuggestions } from '@/domain/recommendations';
import type { CategoryRecommendation } from '@/types/recommendation';
import { Difficulty } from '@/types/types';

/* ------------------------------------------------------------------ */
/*  Mock useInitApp so Dashboard mounts instantly with stub refresh   */
/* ------------------------------------------------------------------ */
const refreshMock = vi.fn().mockResolvedValue(undefined);
const hookState = {
  loading: false,
  username: 'tester',
  progress: [
    {
      tag: 'Array',
      goal: 0.5,
      estimatedScore: 0.4,
      confidenceLevel: 0.4,
      adjustedScore: 0.16,
    },
  ],
  criticalError: false,
  refresh: refreshMock,
};

vi.mock('@/hooks/useInitApp', () => ({
  useInitApp: () => hookState,
}));

vi.mock('@/domain/recommendations');
vi.mock('@/storage/db');

/* ------------------------------------------------------------------ */

describe('Dashboard \u2013 Random category', () => {
  beforeEach(() => {
    vi.mocked(getCategorySuggestions).mockResolvedValue({
      tag: 'Array',
      fundamentals: [],
      refresh: [],
      new: [],
    } as CategoryRecommendation);

    vi.mocked(getRandomSuggestions).mockResolvedValue({
      tag: 'Random' as any,
      fundamentals: [
        {
          slug: 'rand-1',
          title: 'Random One',
          difficulty: Difficulty.Easy,
          popularity: 0.5,
          isFundamental: false,
        },
      ],
      refresh: [],
      new: [],
    } as CategoryRecommendation);

    vi.mocked(db.getAllGoalProfiles).mockResolvedValue([
      {
        id: 'default',
        name: 'Default',
        description: '',
        goals: {},
        createdAt: '',
        isEditable: false,
      },
    ] as any);
    vi.mocked(db.getActiveGoalProfileId).mockResolvedValue('default');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls getRandomSuggestions and hides tags', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const randomBtn = screen.getByRole('button', { name: RANDOM_TAG });
    expect(randomBtn).toBeInTheDocument();

    await user.click(randomBtn);

    await waitFor(() => {
      expect(getRandomSuggestions).toHaveBeenCalledWith(['Array'], 5);
    });

    const cardTitle = await screen.findByText('Random One');
    const card = cardTitle.closest('div')!;
    expect(within(card).queryByText('Array')).not.toBeInTheDocument();
  });
});
