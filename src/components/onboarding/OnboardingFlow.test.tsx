import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingFlow } from './OnboardingFlow';
import * as db from '@/storage/db';
import * as browserDetection from '@/domain/browserDetection';

vi.mock('@/storage/db');
vi.mock('@/domain/browserDetection');

describe('OnboardingFlow', () => {
  const mockOnComplete = vi.fn();
  const mockUsername = 'testuser';

  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).location;
    (window as any).location = { reload: vi.fn() };

    // Default: desktop Chromium browser
    vi.mocked(browserDetection.isChromiumBrowser).mockReturnValue(true);
    vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(false);

    // Mock DB functions
    vi.mocked(db.setPrevUser).mockResolvedValue(undefined);
    vi.mocked(db.db.setUsername).mockResolvedValue(undefined as any);
    vi.mocked(db.markOnboardingComplete).mockResolvedValue(undefined);
  });

  describe('Mobile detection routing', () => {
    it('shows MobileNotSupported when on mobile device', () => {
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(true);
      vi.mocked(browserDetection.isChromiumBrowser).mockReturnValue(true);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      expect(screen.getByText(/Mobile Not Fully Supported/i)).toBeInTheDocument();
    });

    it('prioritizes mobile check over browser check', () => {
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(true);
      vi.mocked(browserDetection.isChromiumBrowser).mockReturnValue(false);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      // Should show mobile screen, not browser screen
      expect(screen.getByText(/Mobile Not Fully Supported/i)).toBeInTheDocument();
    });
  });

  describe('Browser detection routing', () => {
    it('shows BrowserNotSupported when on non-Chromium browser', () => {
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(false);
      vi.mocked(browserDetection.isChromiumBrowser).mockReturnValue(false);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      expect(screen.getByText(/Chromium-based browser required/i)).toBeInTheDocument();
    });
  });

  describe('Extension install step', () => {
    it('shows ExtensionInstall on Chromium desktop', () => {
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(false);
      vi.mocked(browserDetection.isChromiumBrowser).mockReturnValue(true);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      expect(screen.getByText(/Welcome to LeetTracker!/i)).toBeInTheDocument();
    });
  });

  describe('Demo mode activation', () => {
    it('switches to demo user when Try Demo clicked from mobile screen', async () => {
      const user = userEvent.setup();
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(true);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      await user.click(demoButton);

      await waitFor(() => {
        expect(db.setPrevUser).toHaveBeenCalledWith(mockUsername);
      });
    });

    it('switches to demo user when Try Demo clicked from browser screen', async () => {
      const user = userEvent.setup();
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(false);
      vi.mocked(browserDetection.isChromiumBrowser).mockReturnValue(false);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      await user.click(demoButton);

      await waitFor(() => {
        expect(db.setPrevUser).toHaveBeenCalledWith(mockUsername);
      });
    });

    it('sets demo username in database', async () => {
      const user = userEvent.setup();
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(true);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      await user.click(demoButton);

      await waitFor(() => {
        expect(db.db.setUsername).toHaveBeenCalledWith(
          expect.stringContaining('leet-tracker-demo-user'),
        );
      });
    });

    it('marks onboarding complete for demo user', async () => {
      const user = userEvent.setup();
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(true);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      await user.click(demoButton);

      await waitFor(() => {
        expect(db.markOnboardingComplete).toHaveBeenCalledWith(
          expect.stringContaining('leet-tracker-demo-user'),
        );
      });
    });

    it('reloads page after demo selection', async () => {
      const user = userEvent.setup();
      vi.mocked(browserDetection.isMobileBrowser).mockReturnValue(true);

      render(<OnboardingFlow onComplete={mockOnComplete} username={mockUsername} />);

      const demoButton = screen.getByRole('button', { name: /try demo/i });
      await user.click(demoButton);

      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      });
    });
  });
});
