import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import Dashboard from './Dashboard';

// Mock the database to prevent unhandled promise rejections
vi.mock('@/storage/db', () => ({
  db: {
    getAllGoalProfiles: vi.fn().mockResolvedValue([]),
    getActiveGoalProfileId: vi.fn().mockResolvedValue(undefined),
  },
}));

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
