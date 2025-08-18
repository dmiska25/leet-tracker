import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { TutorialProvider, useTutorial } from './TutorialContext';
import * as db from '@/storage/db';

// Mock all dependencies
vi.mock('@/storage/db', () => ({
  db: {
    getUsername: vi.fn(),
    setUsername: vi.fn(),
    ensureInitialized: vi.fn(),
  },
  getTutorialActive: vi.fn(),
  setTutorialActive: vi.fn(),
  getTutorialStep: vi.fn(),
  setTutorialStep: vi.fn(),
  getTutorialStartedWithUser: vi.fn(),
  setTutorialStartedWithUser: vi.fn(),
  markTutorialSeen: vi.fn(),
  clearTutorialSeen: vi.fn(),
  getTutorialSeen: vi.fn(),
  getPrevUser: vi.fn(),
  setPrevUser: vi.fn(),
  clearPrevUser: vi.fn(),
}));

vi.mock('@/tutorial/steps', () => ({
  buildSteps: vi.fn(() => [
    {
      id: 'intro-bars',
      title: 'Welcome',
      body: 'Welcome to the tutorial',
      anchor: '[data-tour="category-bars"]',
      onNext: vi.fn(),
    },
    {
      id: 'finish',
      title: 'Complete',
      body: 'Tutorial finished',
      anchor: '[data-tour="finish"]',
    },
  ]),
}));

// Test component that uses the tutorial context
const TestComponent = () => {
  const { active, stepIndex, next, stop, start, steps } = useTutorial();

  const handleStart = async () => {
    await start(
      [
        {
          id: 'test-step',
          title: 'Test',
          body: 'Test step',
          anchor: '[data-tour="test"]',
        },
      ],
      { startedWith: 'normal' },
    );
  };

  return (
    <div>
      <div data-testid="tutorial-active">{active.toString()}</div>
      <div data-testid="current-step">{stepIndex}</div>
      <div data-testid="steps-count">{steps.length}</div>
      <button data-testid="start-tutorial" onClick={handleStart}>
        Start Tutorial
      </button>
      <button data-testid="next-step" onClick={next}>
        Next Step
      </button>
      <button data-testid="finish-tutorial" onClick={() => stop()}>
        Finish Tutorial
      </button>
      <div data-tour="category-bars">Category bars element</div>
      <div data-tour="finish">Finish element</div>
    </div>
  );
};

describe('TutorialContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    (db.getTutorialActive as Mock).mockResolvedValue(false);
    (db.getTutorialStep as Mock).mockResolvedValue(0);
    (db.getTutorialStartedWithUser as Mock).mockResolvedValue(null);
    (db.getTutorialSeen as Mock).mockResolvedValue(false);
    (db.setTutorialActive as Mock).mockResolvedValue(undefined);
    (db.setTutorialStep as Mock).mockResolvedValue(undefined);
    (db.setTutorialStartedWithUser as Mock).mockResolvedValue(undefined);
    (db.markTutorialSeen as Mock).mockResolvedValue(undefined);
    (db.db.getUsername as Mock).mockResolvedValue('testuser');
    (db.getPrevUser as Mock).mockResolvedValue(null);
    (db.setPrevUser as Mock).mockResolvedValue(undefined);
    (db.clearPrevUser as Mock).mockResolvedValue(undefined);

    // Setup DOM
    document.body.innerHTML = '';
  });

  it('should provide tutorial context values', async () => {
    await act(async () => {
      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('tutorial-active')).toHaveTextContent('false');
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
      expect(screen.getByTestId('steps-count')).toHaveTextContent('0'); // Starts with empty steps
    });
  });

  it('should start tutorial and set active state', async () => {
    await act(async () => {
      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>,
      );
    });

    const startButton = screen.getByTestId('start-tutorial');

    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tutorial-active')).toHaveTextContent('true');
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
      expect(screen.getByTestId('steps-count')).toHaveTextContent('1'); // Mock actually returns 1 step
      expect(db.setTutorialActive).toHaveBeenCalledWith(true);
      expect(db.setTutorialStep).toHaveBeenCalledWith(0);
    });
  });

  it('should proceed to next step', async () => {
    // Start with active tutorial
    (db.getTutorialActive as Mock).mockResolvedValue(true);
    (db.getTutorialStep as Mock).mockResolvedValue(0);

    await act(async () => {
      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>,
      );
    });

    // First start the tutorial to populate steps
    const startButton = screen.getByTestId('start-tutorial');
    await act(async () => {
      fireEvent.click(startButton);
    });

    const nextButton = screen.getByTestId('next-step');

    await act(async () => {
      fireEvent.click(nextButton);
    });

    await waitFor(() => {
      // With only 1 step, next should finish the tutorial
      expect(screen.getByTestId('tutorial-active')).toHaveTextContent('false');
      expect(db.setTutorialActive).toHaveBeenCalledWith(false); // Tutorial finished
    });
  });

  it('should finish tutorial', async () => {
    // Start with active tutorial
    (db.getTutorialActive as Mock).mockResolvedValue(true);
    (db.getTutorialStep as Mock).mockResolvedValue(0);

    await act(async () => {
      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>,
      );
    });

    // First start the tutorial to populate steps
    const startButton = screen.getByTestId('start-tutorial');
    await act(async () => {
      fireEvent.click(startButton);
    });

    const finishButton = screen.getByTestId('finish-tutorial');

    await act(async () => {
      fireEvent.click(finishButton);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tutorial-active')).toHaveTextContent('false');
      expect(db.setTutorialActive).toHaveBeenCalledWith(false);
    });
  });

  it('should handle errors gracefully', async () => {
    // Mock database error
    (db.getTutorialActive as Mock).mockRejectedValue(new Error('DB Error'));

    // Suppress expected console errors during this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <TutorialProvider>
          <TestComponent />
        </TutorialProvider>,
      );
    });

    // Should still render with default values
    await waitFor(() => {
      expect(screen.getByTestId('tutorial-active')).toHaveTextContent('false');
      expect(screen.getByTestId('current-step')).toHaveTextContent('0');
    });

    consoleSpy.mockRestore();
  });
});
