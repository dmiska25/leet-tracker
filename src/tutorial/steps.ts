import type { Step } from './TutorialContext';

export function buildSteps(opts: {
  extensionInstalled: boolean;
  onNavigateToHistory: () => void;
}): Step[] {
  const steps: Step[] = [
    {
      id: 'intro-bars',
      title: 'Category Progress',
      body:
        'These category bars estimate skill by tag.\n' +
        'They combine review score, difficulty weighting, attempt penalties, and recency.',
      anchor: '[data-tour="category-row-0"]',
      placement: 'dynamic',
    },
    {
      id: 'open-first-category',
      title: 'Auto-expanding category',
      body: "We'll automatically expand the first category to show your recommendations.",
      anchor: '[data-tour="category-row-0"]',
      placement: 'dynamic',
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
      placement: 'dynamic',
    },
    {
      id: 'profile-selector',
      title: 'Profiles',
      body:
        'Profiles let you set custom goal weights for each category.\n' +
        'Different companies emphasize different topics, so you can tailor your prep accordingly.',
      anchor: '[data-tour="profile-controls"]',
      placement: 'dynamic',
    },
    {
      id: 'extension-info',
      title: 'Chrome Extension',
      body:
        'LeetTracker includes a Chrome extension for enhanced functionality.\n' +
        'Without the extension, we can only retrieve your 20 most recent solves and have limited accuracy.\n' +
        'The extension auto-captures solve details that will be shown shortly.\n' +
        'Install it from the Chrome Web Store for the best experience.',
      anchor: '[data-tour="extension-warning"]',
      placement: 'dynamic',
    },
    {
      id: 'go-history',
      title: 'Navigate to Solve History',
      body:
        "Let's jump to your Solve History to see code, notes, and feedback.\n" +
        "We'll automatically navigate there for you.",
      anchor: '[data-tour="nav-history"]',
      placement: 'dynamic',
      onNext: () => {
        // Auto-navigate to history view
        opts.onNavigateToHistory();
      },
    },
    {
      id: 'history-list',
      title: 'Your Submissions',
      body: "Solves appear here chronologically. We'll select the first one to view its details.",
      anchor: '[data-tour="solve-history-list"]',
      waitFor: '[data-tour="solve-history-list"]',
      placement: 'dynamic',
      onNext: async () => {
        // Auto-click the first solve item (especially important for mobile)
        const firstSolve = document.querySelector(
          '[data-tour="solve-history-list"] .space-y-2 > div:first-child',
        );
        if (firstSolve instanceof HTMLElement) {
          firstSolve.click();
        }
      },
    },
    {
      id: 'submission-details',
      title: 'Submission Details',
      body:
        'Here you can see your code and analyze different submissions.\n' +
        'These details can be entered manually or captured automatically with the extension.\n' +
        'Compare your past approaches and learning notes.',
      anchor: '[data-tour="submission-details"]',
      placement: 'dynamic',
    },
    {
      id: 'detail-feedback',
      title: 'AI feedback',
      body:
        'We store structured feedback for each solve - entered manually or imported from an LLM.\n' +
        'The prompt construction includes problem description, code, time, hints, and more to give the model sufficient context.\n' +
        'Use "Copy Prompt" → paste in your LLM → copy XML → "Import Feedback".\n' +
        'The final score updates the category bars.',
      anchor: '[data-tour="detail-feedback"]',
      waitFor: '[data-tour="detail-feedback"]',
      placement: 'dynamic',
    },
    {
      id: 'finish',
      title: 'All set!',
      body:
        'The workflow is simple: Click a suggested problem → solve it → store feedback → suggestions update → repeat.\n\n' +
        'You can re-run the tutorial from the menu anytime.\n' +
        "We'll now return you to your original account if we temporarily switched.",
      placement: 'center',
    },
  ];
  return steps;
}
