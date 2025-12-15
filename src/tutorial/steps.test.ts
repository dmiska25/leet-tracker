import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildSteps } from './steps';

describe('Tutorial Steps', () => {
  const mockOnNavigateToHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Step Structure', () => {
    it('should build steps with correct structure', () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      expect(steps).toHaveLength(10);

      steps.forEach((step) => {
        expect(step).toHaveProperty('id');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('body');
        // anchor is optional
      });
    });

    it("should not set an anchor for the 'finish' step", () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });
      const finish = steps.find((s) => s.id === 'finish');
      expect(finish).toBeDefined();
      expect(finish?.anchor).toBeUndefined();
    });

    it('should have correct step IDs in order', () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      const expectedIds = [
        'intro-bars',
        'open-first-category',
        'recommendations',
        'profile-selector',
        'extension-info',
        'go-history',
        'history-list',
        'submission-details',
        'detail-feedback',
        'finish',
      ];

      expect(steps.map((s) => s.id)).toEqual(expectedIds);
    });
  });

  describe('Step Interactions', () => {
    it('should have onNext callback for open-first-category step', () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      const openFirstCategoryStep = steps.find((s) => s.id === 'open-first-category');
      expect(openFirstCategoryStep).toBeDefined();
      expect(openFirstCategoryStep?.onNext).toBeDefined();
    });

    it('should have onNext callback for go-history step', () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      const goHistoryStep = steps.find((s) => s.id === 'go-history');
      expect(goHistoryStep).toBeDefined();
      expect(goHistoryStep?.onNext).toBeDefined();
    });

    it('should execute go-history step navigation', () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      const goHistoryStep = steps.find((s) => s.id === 'go-history');

      if (goHistoryStep?.onNext) {
        goHistoryStep.onNext();
        expect(mockOnNavigateToHistory).toHaveBeenCalled();
      }
    });

    it('should have onNext callback for submission-details step to scroll feedback into view', () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      const submissionDetailsStep = steps.find((s) => s.id === 'submission-details');
      expect(submissionDetailsStep).toBeDefined();
      expect(submissionDetailsStep?.onNext).toBeDefined();
    });

    it('should scroll feedback section into view when submission-details onNext is called', async () => {
      const steps = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      // Create a real DOM element for the test
      const feedbackElement = document.createElement('div');
      feedbackElement.setAttribute('data-tour', 'detail-feedback');
      const mockScrollIntoView = vi.fn();
      feedbackElement.scrollIntoView = mockScrollIntoView;
      document.body.appendChild(feedbackElement);

      const submissionDetailsStep = steps.find((s) => s.id === 'submission-details');

      if (submissionDetailsStep?.onNext) {
        await submissionDetailsStep.onNext();

        expect(mockScrollIntoView).toHaveBeenCalledWith({
          behavior: 'smooth',
          block: 'center',
        });
      }

      // Cleanup
      document.body.removeChild(feedbackElement);
    });
  });

  describe('Extension Integration', () => {
    it('should return same steps regardless of extension status', () => {
      const stepsWithExtension = buildSteps({
        extensionInstalled: true,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      const stepsWithoutExtension = buildSteps({
        extensionInstalled: false,
        onNavigateToHistory: mockOnNavigateToHistory,
      });

      expect(stepsWithExtension).toHaveLength(stepsWithoutExtension.length);

      // Steps should be identical since extension-specific logic isn't in content
      stepsWithExtension.forEach((step, index) => {
        expect(step.id).toBe(stepsWithoutExtension[index].id);
        expect(step.title).toBe(stepsWithoutExtension[index].title);
        expect(step.body).toBe(stepsWithoutExtension[index].body);
      });
    });
  });
});
