import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Dashboard from './Dashboard';

vi.mock('@/hooks/useInitApp', () => ({
  useInitApp: () => ({
    loading: false,
    username: 'tester',
    progress: [],
    criticalError: true,
    refresh: vi.fn(),
  }),
}));

describe('<Dashboard> critical error state', () => {
  it('displays the critical error notice', () => {
    render(<Dashboard />);

    expect(screen.getByText(/Progress data could not be loaded/i)).toBeInTheDocument();
  });
});
