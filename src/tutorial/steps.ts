import type { Step } from './TutorialContext';

export function buildSteps(opts: {
  extensionInstalled: boolean;
  onNavigateToHistory: () => void;
}): Step[] {
  const steps: Step[] = [
    {
      id: 'intro-bars',
      title: 'Welcome to LeetTracker',
      body:
        'These category bars estimate skill by tag.\n' +
        'They combine quality, difficulty weighting, attempt penalties, and recency.',
      anchor: '[data-tour="category-row-0"]',
      placement: 'bottom',
    },
    {
      id: 'open-first-category',
      title: 'Auto-expanding category',
      body: "We'll automatically expand the first category to show your recommendations.",
      anchor: '[data-tour="category-row-0"]',
      placement: 'bottom',
      onNext: async () => {
        // Auto-click the first category to expand it
        const firstCategory = document.querySelector('[data-tour="category-row-0"] button');
        if (firstCategory instanceof HTMLElement) {
          firstCategory.click();
        }
      },
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      body:
        'Each category has three suggestion buckets:\n' +
        '• Fundamentals: popular, unsolved basics\n' +
        '• Refresh: past solves that deserve another pass\n' +
        '• New: fresh unsolved picks',
      anchor: '[data-tour="category-row-0"]',
      placement: 'top',
    },
    {
      id: 'profile-selector',
      title: 'Profiles',
      body:
        'You can set goal percentages per category with Profiles.\n' +
        "We won't change anything now, just letting you know.",
      anchor: '[data-tour="profile-controls"]',
      placement: 'bottom',
    },
    {
      id: 'go-history',
      title: 'Navigate to Solve History',
      body:
        "Let's jump to your Solve History to see code, notes, and feedback.\n" +
        "We'll automatically navigate there for you.",
      anchor: '[data-tour="nav-history"]',
      placement: 'bottom',
      onNext: () => {
        // Auto-navigate to history view
        opts.onNavigateToHistory();
      },
    },
    {
      id: 'history-list',
      title: 'Your submissions',
      body: "Solves appear here chronologically. We'll select the first one to view its details.",
      anchor: '[data-tour="solve-history-list"]',
      waitFor: '[data-tour="solve-history-list"]',
      placement: 'right',
    },
    {
      id: 'submission-details',
      title: 'Submission Details',
      body:
        'Here you can see your code and analyze different submissions.\n' +
        'Compare your past approaches and learning notes.',
      anchor: '[data-tour="submission-details"]',
      placement: 'bottom',
    },
    {
      id: 'detail-feedback',
      title: 'AI feedback',
      body:
        'Use "Copy Prompt" → paste in your LLM → copy XML → "Import Feedback".\n' +
        'The final score updates the category bars.',
      anchor: '[data-tour="detail-feedback"]',
      waitFor: '[data-tour="detail-feedback"]',
      placement: 'top',
    },
    {
      id: 'finish',
      title: 'All set!',
      body:
        "That's it. You can re-run the tutorial from the menu anytime.\n" +
        "We'll now return you to your original account if we temporarily switched.",
      placement: 'center',
    },
  ];
  return steps;
}
