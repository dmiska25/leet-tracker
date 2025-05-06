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
    setUsernameSpy = vi.spyOn(db, 'setUsername').mockResolvedValue('');
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    setUsernameSpy.mockRestore();
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

  it('confirms and signs out when Sign Out button is clicked', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutBtn);

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(setUsernameSpy).toHaveBeenCalledWith('');
      expect(reloadSpy).toHaveBeenCalled();
    });
  });
});
