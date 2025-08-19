import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { TutorialProvider } from '@/tutorial/TutorialContext';

test('renders the main heading', () => {
  render(
    <TutorialProvider>
      <App />
    </TutorialProvider>,
  );
  expect(screen.getByText(/Loading…/i)).toBeInTheDocument();
});
