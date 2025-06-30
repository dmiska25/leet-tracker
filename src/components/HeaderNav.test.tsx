import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';

import HeaderNav from './HeaderNav';
import { db } from '@/storage/db';

// Helper: noop onChange
const noop = () => undefined;

describe('<HeaderNav>', () => {
  /* ------------------------------------------------------------ */
  /*  Sign‑out flow mocks                                         */
  /* ------------------------------------------------------------ */
  let confirmSpy: Mock;
  let reloadSpy: ReturnType<typeof vi.fn>;
  let setUsernameSpy: Mock;
  let setActiveSpy: Mock;
  let clearProfilesSpy: Mock;
  let clearSolvesSpy: Mock;
  let setExtTsSpy: Mock;
  const originalLocation = window.location;

  beforeEach(() => {
    /* confirm dialog */
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true) as Mock;

    /* location.reload */
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload: reloadSpy },
    });

    /* db spies */
    setUsernameSpy = vi.spyOn(db, 'setUsername').mockResolvedValue('') as Mock;
    setActiveSpy = vi.spyOn(db, 'setActiveGoalProfile').mockResolvedValue('') as Mock;
    clearProfilesSpy = vi.spyOn(db, 'clearGoalProfiles').mockResolvedValue(undefined) as Mock;
    clearSolvesSpy = vi.spyOn(db, 'clearSolves').mockResolvedValue(undefined) as Mock;
    setExtTsSpy = vi.spyOn(db, 'setExtensionLastTimestamp').mockResolvedValue('') as Mock;
  });

  afterEach(() => {
    confirmSpy.mockRestore();
    setUsernameSpy.mockRestore();
    setActiveSpy.mockRestore();
    clearProfilesSpy.mockRestore();
    clearSolvesSpy.mockRestore();
    setExtTsSpy.mockRestore();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  /* ------------------------------------------------------------ */
  /*  Navigation buttons                                          */
  /* ------------------------------------------------------------ */
  it('calls onChange with "history" when History nav is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<HeaderNav view="dashboard" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /history/i }));
    expect(onChange).toHaveBeenCalledWith('history');
  });

  it('calls onChange with "dashboard" when Dashboard nav is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<HeaderNav view="history" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /dashboard/i }));
    expect(onChange).toHaveBeenCalledWith('dashboard');
  });

  /* ------------------------------------------------------------ */
  /*  Sign‑out behaviour                                          */
  /* ------------------------------------------------------------ */
  it('confirms and signs out when Sign Out button is clicked', async () => {
    const user = userEvent.setup();

    render(<HeaderNav view="dashboard" onChange={noop} />);

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutBtn);

    expect(confirmSpy).toHaveBeenCalled();

    await waitFor(() => {
      expect(setUsernameSpy).toHaveBeenCalledWith('');
      expect(reloadSpy).toHaveBeenCalled();
    });
  });
});
