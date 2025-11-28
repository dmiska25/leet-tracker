import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataSync } from './DataSync';
import * as onboardingSync from '@/domain/onboardingSync';
import * as db from '@/storage/db';
import * as authModule from '@/utils/auth';

vi.mock('@/domain/onboardingSync');
vi.mock('@/storage/db');
vi.mock('@/utils/auth', () => ({
  signOut: vi.fn().mockResolvedValue(undefined),
}));

describe('DataSync', () => {
  const mockOnComplete = vi.fn();
  const mockUsername = 'testuser';

  beforeEach(() => {
    vi.clearAllMocks();

    delete (window as any).location;
    (window as any).location = { reload: vi.fn() };

    vi.mocked(db.db.clearUsername).mockResolvedValue(undefined as any);
    vi.mocked(db.setPrevUser).mockResolvedValue(undefined);
    vi.mocked(db.db.setUsername).mockResolvedValue(undefined as any);
    vi.mocked(db.markOnboardingComplete).mockResolvedValue(undefined);
  });

  describe('Manifest detection and sync monitoring', () => {
    it('checks for valid manifest on mount', async () => {
      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: false,
        total: null,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(onboardingSync.checkForValidManifest).toHaveBeenCalledWith(mockUsername);
      });
    });

    it('monitors sync progress when manifest detected', async () => {
      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: true,
        total: 100,
      });

      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'syncing',
        progress: 50,
        total: 100,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(onboardingSync.monitorSyncProgress).toHaveBeenCalledWith(mockUsername);
      });
    });

    it('calls onComplete when sync reaches 100%', async () => {
      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: true,
        total: 100,
      });

      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'complete',
        progress: 100,
        total: 100,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(
        () => {
          expect(mockOnComplete).toHaveBeenCalled();
        },
        { timeout: 3000 },
      );
    });

    it('displays error when sync fails', async () => {
      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: true,
        total: 100,
      });

      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'syncing',
        progress: 25,
        total: 100,
        error: 'Failed to sync from extension',
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(
          screen.getByText(/error detected during sync.*ensure the extension is installed/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('User interactions', () => {
    it('opens LeetCode when button clicked in waiting state', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.fn();
      window.open = mockOpen;

      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: false,
        total: null,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to leetcode/i })).toBeInTheDocument();
      });

      const leetcodeButton = screen.getByRole('button', { name: /go to leetcode/i });
      await user.click(leetcodeButton);

      expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining('leetcode.com'), '_blank');
    });

    it('allows demo mode during sync', async () => {
      const user = userEvent.setup();

      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: true,
        total: 100,
      });

      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'syncing',
        progress: 50,
        total: 100,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /check out demo while you wait/i }),
        ).toBeInTheDocument();
      });

      const demoButton = screen.getByRole('button', { name: /check out demo while you wait/i });
      await user.click(demoButton);

      await waitFor(() => {
        expect(db.db.clearUsername).toHaveBeenCalled();
        expect(db.db.setUsername).toHaveBeenCalled();
      });

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('allows sign out during sync', async () => {
      const user = userEvent.setup();

      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: true,
        total: 100,
      });

      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'syncing',
        progress: 50,
        total: 100,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
      });

      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await user.click(signOutButton);

      await waitFor(() => {
        expect(authModule.signOut).toHaveBeenCalled();
      });
    });
  });

  describe('Different extension states', () => {
    beforeEach(() => {
      vi.mocked(onboardingSync.checkForValidManifest).mockResolvedValue({
        hasManifest: true,
        total: null,
      });
    });

    it('handles legacy extension (total null)', async () => {
      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'syncing',
        progress: 0,
        total: null,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(onboardingSync.monitorSyncProgress).toHaveBeenCalled();
      });
    });

    it('handles new extension not started', async () => {
      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'syncing',
        progress: 0,
        total: 150,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(onboardingSync.monitorSyncProgress).toHaveBeenCalled();
      });
    });

    it('handles active sync with progress', async () => {
      vi.mocked(onboardingSync.monitorSyncProgress).mockResolvedValue({
        status: 'syncing',
        progress: 75,
        total: 150,
      });

      render(<DataSync onComplete={mockOnComplete} username={mockUsername} />);

      await waitFor(() => {
        expect(onboardingSync.monitorSyncProgress).toHaveBeenCalled();
      });
    });
  });
});
