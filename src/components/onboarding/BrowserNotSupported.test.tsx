import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserNotSupported } from './BrowserNotSupported';
import * as authModule from '@/utils/auth';

// Mock the auth module
vi.mock('@/utils/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe('BrowserNotSupported', () => {
  it('renders the browser not supported message', () => {
    const onTryDemo = vi.fn();
    render(<BrowserNotSupported onTryDemo={onTryDemo} />);

    expect(screen.getByText('Chrome Required')).toBeInTheDocument();
    expect(
      screen.getByText('LeetTracker requires a Chrome browser extension to function'),
    ).toBeInTheDocument();
  });

  it('displays information about compatible browsers', () => {
    const onTryDemo = vi.fn();
    render(<BrowserNotSupported onTryDemo={onTryDemo} />);

    expect(screen.getByText('Compatible Browsers')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Google Chrome, Microsoft Edge, Brave, Opera, Samsung Internet, and other Chromium-based browsers',
      ),
    ).toBeInTheDocument();
  });

  it('calls onTryDemo when Try Demo button is clicked', async () => {
    const user = userEvent.setup();
    const onTryDemo = vi.fn();
    render(<BrowserNotSupported onTryDemo={onTryDemo} />);

    const tryDemoButton = screen.getByRole('button', { name: /try demo/i });
    await user.click(tryDemoButton);

    expect(onTryDemo).toHaveBeenCalledTimes(1);
  });

  it('clears username and reloads when Sign Out is clicked', async () => {
    const user = userEvent.setup();
    const onTryDemo = vi.fn();

    render(<BrowserNotSupported onTryDemo={onTryDemo} />);

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await user.click(signOutButton);

    await waitFor(() => {
      expect(authModule.signOut).toHaveBeenCalledTimes(1);
    });
  });

  it('explains why Chrome is required', () => {
    const onTryDemo = vi.fn();
    render(<BrowserNotSupported onTryDemo={onTryDemo} />);

    expect(
      screen.getByText(/LeetTracker uses a Chrome extension to sync your LeetCode progress/i),
    ).toBeInTheDocument();
  });

  it('lists compatible browsers', () => {
    const onTryDemo = vi.fn();
    render(<BrowserNotSupported onTryDemo={onTryDemo} />);

    expect(
      screen.getByText(/Google Chrome, Microsoft Edge, Brave, Opera, Samsung Internet/i),
    ).toBeInTheDocument();
  });
});
