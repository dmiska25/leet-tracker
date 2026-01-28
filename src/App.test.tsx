import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { TutorialProvider } from '@/tutorial/TutorialContext';

test('renders the main heading', () => {
  render(
    <MemoryRouter>
      <TutorialProvider>
        <App />
      </TutorialProvider>
    </MemoryRouter>,
  );
  expect(screen.getByText(/Loading…/i)).toBeInTheDocument();
});
