import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';

import Dashboard from './Dashboard';
import { db } from '@/storage/db';

/* ------------------------------------------------------------------ */
/*  Mock useInitApp so Dashboard mounts instantly with stub refresh   */
/* ------------------------------------------------------------------ */
const refreshMock = vi.fn().mockResolvedValue(undefined);
const hookState = {
  loading: false,
  username: 'testuser',
  progress: [],
  criticalError: false,
  refresh: refreshMock,
};

vi.mock('@/hooks/useInitApp', () => ({
  useInitApp: () => hookState,
}));

/* ------------------------------------------------------------------ */

describe('Dashboard – Manage Profiles modal', () => {
  let getAllGoalProfilesSpy: ReturnType<typeof vi.spyOn>;
  let getActiveGoalProfileIdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    /* goal profiles returned to the ProfileManager inside the modal */
    const profiles = [
      {
        id: 'default',
        name: 'Default',
        description: '',
        goals: {},
        createdAt: '',
        isEditable: false,
      },
      { id: 'alt', name: 'Alt', description: '', goals: {}, createdAt: '', isEditable: true },
    ] as any;

    getAllGoalProfilesSpy = vi.spyOn(db, 'getAllGoalProfiles').mockResolvedValue(profiles);
    getActiveGoalProfileIdSpy = vi.spyOn(db, 'getActiveGoalProfileId').mockResolvedValue('default');
  });

  afterEach(() => {
    getAllGoalProfilesSpy.mockRestore();
    getActiveGoalProfileIdSpy.mockRestore();
  });

  it('opens and closes the Manage Profiles modal', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    /* open modal */
    const openBtn = screen.getByRole('button', { name: /manage profiles/i });
    await user.click(openBtn);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /manage profiles/i })).toBeInTheDocument(),
    );

    /* close modal via "X” button */
    await user.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /manage profiles/i })).not.toBeInTheDocument(),
    );
  });
});
