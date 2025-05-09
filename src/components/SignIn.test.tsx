import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, it, beforeEach, afterEach, Mock } from 'vitest';

import SignIn from './SignIn';
import { ToastProvider } from './ui/toast';
import { verifyUser } from '@/api/leetcode';
import { db } from '@/storage/db';

vi.mock('@/api/leetcode');
vi.mock('@/storage/db');

describe('<SignIn>', () => {
  let reloadSpy: Mock;

  beforeEach(() => {
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload: reloadSpy },
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const renderWithToast = () =>
    render(
      <ToastProvider>
        <SignIn />
      </ToastProvider>,
    );

  it('saves username and reloads on successful sign-in', async () => {
    vi.mocked(verifyUser).mockResolvedValue({ exists: true });
    vi.mocked(db.setUsername).mockResolvedValue('tester');

    const user = userEvent.setup();
    renderWithToast();

    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'tester');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(db.setUsername).toHaveBeenCalledWith('tester');
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  it('shows toast error when user does not exist', async () => {
    vi.mocked(verifyUser).mockResolvedValue({ exists: false });

    const user = userEvent.setup();
    renderWithToast();

    await user.type(screen.getByPlaceholderText(/e\.g\./i), 'ghost');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify the toast message appears
    const toast = await screen.findByText(/User not found/i);
    expect(toast).toBeInTheDocument();

    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
