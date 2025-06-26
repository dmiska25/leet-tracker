import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { useInitApp } from './useInitApp';
import { initApp as realInitApp } from '@/domain/initApp';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

// Spy‑able toast helper
const toastMock = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  useToast: () => toastMock,
}));

// Mock initApp itself
vi.mock('@/domain/initApp');
const initApp = vi.mocked(realInitApp);

describe('useInitApp', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('loads data, forwards warnings via toast and clears loading/criticalError', async () => {
    initApp.mockResolvedValue({
      username: 'alice',
      progress: [],
      errors: ['warn‑1', 'warn‑2'],
      extensionInstalled: false,
    });

    const { result } = renderHook(() => useInitApp());

    // initial state
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    // state expectations
    expect(result.current.username).toBe('alice');
    expect(result.current.criticalError).toBe(false);

    // toast called once per warning
    expect(toastMock).toHaveBeenCalledTimes(2);
    expect(toastMock).toHaveBeenNthCalledWith(1, 'warn‑1', 'error');
    expect(toastMock).toHaveBeenNthCalledWith(2, 'warn‑2', 'error');
  });

  it('sets criticalError=true when initApp throws', async () => {
    initApp.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useInitApp());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.criticalError).toBe(true);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it('refresh() triggers a reload cycle', async () => {
    // First init call
    initApp.mockResolvedValueOnce({
      username: 'bob',
      progress: [],
      errors: [],
      extensionInstalled: false,
    });

    const { result } = renderHook(() => useInitApp());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Second init call (for refresh)
    initApp.mockResolvedValueOnce({
      username: 'bob',
      progress: [],
      errors: [],
      extensionInstalled: false,
    });

    // Run the entire refresh flow inside act so all state updates are flushed
    await act(async () => {
      await result.current.refresh();
    });

    // After refresh finishes the hook should be idle again
    expect(result.current.loading).toBe(false);
    expect(result.current.criticalError).toBe(false);
    expect(initApp).toHaveBeenCalledTimes(2);
  });
});
