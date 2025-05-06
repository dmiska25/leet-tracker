import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { ThemeToggle } from './ThemeToggle';
import { ModeBadge } from './ModeBadge';

describe('ThemeToggle & ModeBadge', () => {
  it('toggles dark mode class on <html> and updates ModeBadge label', async () => {
    const user = userEvent.setup();
    render(
      <>
        <ThemeToggle />
        <ModeBadge />
      </>,
    );

    // initial state
    expect(document.documentElement).not.toHaveClass('dark');
    expect(screen.getByText(/Light Mode/i)).toBeInTheDocument();

    // toggle on
    await user.click(screen.getByRole('button', { name: /toggle theme/i }));
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    expect(screen.getByText(/Dark Mode/i)).toBeInTheDocument();

    // toggle off
    await user.click(screen.getByRole('button', { name: /toggle theme/i }));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
    expect(screen.getByText(/Light Mode/i)).toBeInTheDocument();
  });
});
