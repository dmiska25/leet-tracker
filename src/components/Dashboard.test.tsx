import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, afterEach, expect, Mock } from 'vitest';
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
  refresh: refreshMock,
};

vi.mock('@/hooks/useInitApp', () => ({
  useInitApp: () => hookState,
}));

/* ------------------------------------------------------------------ */

describe('Dashboard buttons', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;
  let reloadSpy: ReturnType<typeof vi.fn>;
  let setUsernameSpy: ReturnType<typeof vi.spyOn>;
  let getAllGoalProfilesSpy: ReturnType<typeof vi.spyOn>;
  let getActiveGoalProfileIdSpy: ReturnType<typeof vi.spyOn>;
  let setActiveProfileSpy: ReturnType<typeof vi.spyOn>;
  const originalLocation = window.location;

  beforeEach(() => {
    refreshMock.mockClear();

    /* confirm dialog */
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true) as Mock;

    /* location.reload */
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });

    /* db.setUsername */
    setUsernameSpy = vi.spyOn(db, 'setUsername').mockResolvedValue('') as Mock;

    /* goal profiles */
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
    setActiveProfileSpy = vi.spyOn(db, 'setActiveGoalProfile').mockResolvedValue('') as Mock;
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    setUsernameSpy.mockRestore();
    setActiveProfileSpy.mockRestore();
    getAllGoalProfilesSpy.mockRestore();
    getActiveGoalProfileIdSpy.mockRestore();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('calls refresh when Sync Now button is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const button = screen.getByRole('button', { name: /sync now/i });
    expect(button).toBeEnabled();

    await user.click(button);

    await waitFor(() => expect(refreshMock).toHaveBeenCalledTimes(1));
  });

  it('changes active profile when dropdown item clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    // Wait for the default profile to appear in the dropdown button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Default/i })).toBeInTheDocument();
    });

    // open dropdown
    await user.click(screen.getByRole('button', { name: /Default/i }));
    // select alternate profile
    await user.click(screen.getByRole('option', { name: /Alt/i }));

    await waitFor(() => {
      expect(setActiveProfileSpy).toHaveBeenCalledWith('alt');
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
