import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtensionInstall } from './ExtensionInstall';
import * as extensionBridge from '@/api/extensionBridge';
import * as authModule from '@/utils/auth';

vi.mock('@/api/extensionBridge');
vi.mock('@/utils/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe('ExtensionInstall', () => {
  const mockOnContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    delete (window as any).location;
    (window as any).location = { reload: vi.fn() };

    vi.mocked(extensionBridge.checkExtensionInstalled).mockResolvedValue(false);
  });

  describe('Extension detection', () => {
    it('checks for extension on mount', async () => {
      vi.mocked(extensionBridge.checkExtensionInstalled).mockResolvedValue(false);

      render(<ExtensionInstall onContinue={mockOnContinue} />);

      await waitFor(() => {
        expect(extensionBridge.checkExtensionInstalled).toHaveBeenCalled();
      });
    });

    it('calls onContinue(false) when extension detected', async () => {
      vi.mocked(extensionBridge.checkExtensionInstalled).mockResolvedValue(true);

      render(<ExtensionInstall onContinue={mockOnContinue} />);

      await waitFor(
        () => {
          expect(mockOnContinue).toHaveBeenCalledWith(false);
        },
        { timeout: 3000 },
      );
    });
  });

  describe('User interactions', () => {
    beforeEach(() => {
      vi.mocked(extensionBridge.checkExtensionInstalled).mockResolvedValue(false);
    });

    it('opens install URL when Install Extension clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.fn();
      window.open = mockOpen;

      render(<ExtensionInstall onContinue={mockOnContinue} />);

      // Wait for checking to complete
      await waitFor(() => {
        expect(screen.queryByText(/checking for extension/i)).not.toBeInTheDocument();
      });

      const installButton = screen.getByRole('button', { name: /install chrome extension/i });
      await user.click(installButton);

      expect(mockOpen).toHaveBeenCalledWith(expect.any(String), '_blank');
    });

    it('calls onContinue with true when Try Demo clicked', async () => {
      const user = userEvent.setup();

      render(<ExtensionInstall onContinue={mockOnContinue} />);

      // Wait for checking to complete
      await waitFor(() => {
        expect(screen.queryByText(/checking for extension/i)).not.toBeInTheDocument();
      });

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      await user.click(demoButton);

      expect(mockOnContinue).toHaveBeenCalledWith(true);
    });

    it('calls signOut when Sign Out clicked', async () => {
      const user = userEvent.setup();

      render(<ExtensionInstall onContinue={mockOnContinue} />);

      // Wait for checking to complete
      await waitFor(() => {
        expect(screen.queryByText(/checking for extension/i)).not.toBeInTheDocument();
      });

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(authModule.signOut).toHaveBeenCalled();
      });
    });

    it('reloads page when Refresh clicked', async () => {
      const user = userEvent.setup();

      render(<ExtensionInstall onContinue={mockOnContinue} />);

      // Wait for checking to complete and refresh button to appear
      await waitFor(() => {
        expect(screen.queryByText(/checking for extension/i)).not.toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(window.location.reload).toHaveBeenCalled();
    });
  });
});
