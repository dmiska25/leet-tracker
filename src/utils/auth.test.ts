import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signOut } from './auth';
import * as db from '@/storage/db';
import * as analytics from './analytics';

vi.mock('@/storage/db');
vi.mock('./analytics');

describe('signOut', () => {
  let originalLocation: Location;
  let reloadSpy: ReturnType<typeof vi.fn>;
  let confirmSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.location.reload
    originalLocation = window.location;
    reloadSpy = vi.fn();
    delete (window as any).location;
    (window as any).location = { reload: reloadSpy };

    // Mock window.confirm
    confirmSpy = vi.fn(() => true);
    window.confirm = confirmSpy;

    // Mock alert
    window.alert = vi.fn();

    // Default mock implementations
    vi.mocked(db.db.clearUsername).mockResolvedValue(undefined as any);
    vi.mocked(analytics.resetUser).mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('clears username and reloads page', async () => {
    await signOut();

    expect(db.db.clearUsername).toHaveBeenCalledTimes(1);
    expect(analytics.resetUser).toHaveBeenCalledTimes(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('does not show confirmation by default', async () => {
    await signOut();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('shows confirmation when skipConfirm is false', async () => {
    confirmSpy.mockReturnValue(true);

    await signOut({ skipConfirm: false });

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to sign out?');
    expect(db.db.clearUsername).toHaveBeenCalled();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('does not sign out if user cancels confirmation', async () => {
    confirmSpy.mockReturnValue(false);

    await signOut({ skipConfirm: false });

    expect(confirmSpy).toHaveBeenCalled();
    expect(db.db.clearUsername).not.toHaveBeenCalled();
    expect(analytics.resetUser).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('handles errors from clearUsername', async () => {
    const error = new Error('Failed to clear username');
    vi.mocked(db.db.clearUsername).mockRejectedValue(error);

    await signOut();

    expect(db.db.clearUsername).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      'An error occurred while signing out. Please try again.',
    );
    expect(reloadSpy).not.toHaveBeenCalled(); // Should not reload on error
  });

  it('handles errors from resetUser', async () => {
    const error = new Error('Failed to reset analytics');
    vi.mocked(analytics.resetUser).mockRejectedValue(error);

    await signOut();

    expect(db.db.clearUsername).toHaveBeenCalled();
    expect(analytics.resetUser).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      'An error occurred while signing out. Please try again.',
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('calls custom error callback when provided', async () => {
    const error = new Error('Custom error');
    const errorCallback = vi.fn();
    vi.mocked(db.db.clearUsername).mockRejectedValue(error);

    await signOut({ errorCallback });

    expect(errorCallback).toHaveBeenCalledWith(error);
    expect(window.alert).not.toHaveBeenCalled(); // Should not show default alert
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('logs error to console on failure', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Test error');
    vi.mocked(db.db.clearUsername).mockRejectedValue(error);

    await signOut();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[auth] Failed to sign out:', error);

    consoleErrorSpy.mockRestore();
  });

  it('completes full sign-out flow in correct order', async () => {
    const callOrder: string[] = [];

    vi.mocked(db.db.clearUsername).mockImplementation(async () => {
      callOrder.push('clearUsername');
    });

    vi.mocked(analytics.resetUser).mockImplementation(async () => {
      callOrder.push('resetUser');
    });

    reloadSpy.mockImplementation(() => {
      callOrder.push('reload');
    });

    await signOut();

    expect(callOrder).toEqual(['clearUsername', 'resetUser', 'reload']);
  });
});
