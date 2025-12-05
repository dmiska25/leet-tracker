import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileNotSupported } from './MobileNotSupported';
import * as authModule from '@/utils/auth';

// Mock the auth module
vi.mock('@/utils/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe('MobileNotSupported', () => {
  it('renders mobile warning message', () => {
    render(<MobileNotSupported onTryDemo={vi.fn()} />);
    expect(screen.getByText('Mobile Not Fully Supported')).toBeInTheDocument();
    expect(screen.getByText(/LeetTracker is optimized for desktop browsers/)).toBeInTheDocument();
  });

  it('explains why desktop is required', () => {
    render(<MobileNotSupported onTryDemo={vi.fn()} />);
    expect(
      screen.getByText(/Chrome extensions are not supported on mobile browsers/),
    ).toBeInTheDocument();
  });

  it('has Try Demo button', () => {
    render(<MobileNotSupported onTryDemo={vi.fn()} />);
    const demoButton = screen.getByRole('button', { name: /try demo/i });
    expect(demoButton).toBeInTheDocument();
  });

  it('calls onTryDemo when Try Demo button is clicked', async () => {
    const user = userEvent.setup();
    const onTryDemo = vi.fn();
    render(<MobileNotSupported onTryDemo={onTryDemo} />);

    const demoButton = screen.getByRole('button', { name: /try demo/i });
    await user.click(demoButton);

    expect(onTryDemo).toHaveBeenCalledTimes(1);
  });

  it('shows warning about mobile demo limitations', () => {
    render(<MobileNotSupported onTryDemo={vi.fn()} />);
    expect(
      screen.getByText(/the experience is not optimized for mobile devices/),
    ).toBeInTheDocument();
  });

  it('has sign out button', () => {
    render(<MobileNotSupported onTryDemo={vi.fn()} />);
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    expect(signOutButton).toBeInTheDocument();
  });

  it('calls signOut when Sign Out button is clicked', async () => {
    const user = userEvent.setup();
    render(<MobileNotSupported onTryDemo={vi.fn()} />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);

    expect(authModule.signOut).toHaveBeenCalledTimes(1);
  });
});
