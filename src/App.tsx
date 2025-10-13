import { useEffect, useMemo, useState } from 'react';
import { useInitApp } from '@/hooks/useInitApp';
import Dashboard from '@/components/Dashboard';
import SignIn from '@/components/SignIn';
import SolveHistory from '@/components/solveHistory/SolveHistory';
import HeaderNav from '@/components/HeaderNav';
import TutorialPrompt from '@/components/TutorialPrompt';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { useTutorial } from '@/tutorial/TutorialContext';
import { buildSteps } from '@/tutorial/steps';
import { db } from '@/storage/db';
import {
  getTutorialSeen,
  markTutorialSeen,
  getTutorialActive,
  getTutorialStartedWithUser,
  setPrevUser,
  getOnboardingComplete,
  markOnboardingComplete,
} from '@/storage/db';

function App() {
  const { loading, username, extensionInstalled } = useInitApp();
  const [view, setView] = useState<'dashboard' | 'history'>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const tutorial = useTutorial();
  const [showPrompt, setShowPrompt] = useState(false);
  const [tutorialInitialized, setTutorialInitialized] = useState(false);

  const demoUsername = import.meta.env.VITE_DEMO_USERNAME || 'leet-tracker-demo-user';

  const steps = useMemo(
    () =>
      buildSteps({
        extensionInstalled,
        onNavigateToHistory: () => setView('history'),
      }),
    [extensionInstalled],
  );

  // Check if user needs to see onboarding
  useEffect(() => {
    (async () => {
      if (loading || onboardingChecked) return;
      if (!username) {
        setOnboardingChecked(true);
        return;
      }

      // Skip onboarding for demo user entirely
      if (username === demoUsername) {
        setShowOnboarding(false);
        setOnboardingChecked(true);
        return;
      }

      // Check if this user has completed onboarding
      const hasCompleted = await getOnboardingComplete(username);
      setShowOnboarding(!hasCompleted);
      setOnboardingChecked(true);
    })();
  }, [loading, username, onboardingChecked, demoUsername]);

  // Handle navigation events from tutorial
  useEffect(() => {
    const handleNavigateToHistory = () => setView('history');
    const handleShowTutorialPrompt = () => setShowPrompt(true);

    window.addEventListener('leet:navigate-to-history', handleNavigateToHistory);
    window.addEventListener('leet:show-tutorial-prompt', handleShowTutorialPrompt);
    return () => {
      window.removeEventListener('leet:navigate-to-history', handleNavigateToHistory);
      window.removeEventListener('leet:show-tutorial-prompt', handleShowTutorialPrompt);
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (loading || tutorialInitialized) return;
      if (!username) return; // No prompt on sign-in screen

      // If tutorial is already active, check if we need to provide steps
      if (await getTutorialActive()) {
        // If we're on demo account and tutorial is active but no steps are loaded,
        // we need to restart with steps (happens after user switching + reload)
        if (username === demoUsername && tutorial.steps.length === 0) {
          const startedWithUser = await getTutorialStartedWithUser();
          await tutorial.start(steps, { startedWith: startedWithUser || 'normal' });
        }
        setTutorialInitialized(true);
        return;
      }

      // If user has opted out, don't show prompt
      if (await getTutorialSeen()) {
        setTutorialInitialized(true);
        return;
      }

      // If we're the demo user and tutorial was started by switching from normal user,
      // start tutorial immediately without prompt
      const startedWithUser = await getTutorialStartedWithUser();
      if (username === demoUsername && startedWithUser === 'normal') {
        await tutorial.start(steps, { startedWith: 'normal' });
        setTutorialInitialized(true);
        return;
      }

      // Show tutorial prompt to any signed-in user
      setShowPrompt(true);
      setTutorialInitialized(true);
    })();
  }, [loading, username, demoUsername, tutorial, steps, tutorialInitialized]);

  const startTutorialFlow = async () => {
    setShowPrompt(false);

    // If the user is already demo, just start the tutorial
    if (username === demoUsername) {
      tutorial.start(steps, { startedWith: 'demo' });
      return;
    }

    // Normal user: switch to demo, remember who to restore.
    await setPrevUser(username!);
    await db.setUsername(demoUsername);
    // We want the tutorial to autostart after reload:
    //   TutorialProvider resumes because tutorial.active stays true.
    // Set active now and reload.
    await tutorial.start(steps, { startedWith: 'normal' });

    // Important: after setting state, reload to ensure demo data loads
    window.location.reload();
  };

  const handleOnboardingComplete = async () => {
    if (username) {
      await markOnboardingComplete(username);
      setShowOnboarding(false);
    }
  };

  if (loading || !onboardingChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }
  if (!username) {
    return <SignIn />;
  }

  // Show onboarding flow for users who haven't completed it (excluding demo user)
  if (showOnboarding && username !== demoUsername) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} username={username} />;
  }

  return (
    <>
      <HeaderNav view={view} onChange={setView} />
      <TutorialPrompt
        open={showPrompt}
        onStart={startTutorialFlow}
        onLater={() => setShowPrompt(false)}
        onNever={async () => {
          await markTutorialSeen();
          setShowPrompt(false);
        }}
      />
      {view === 'dashboard' ? <Dashboard /> : <SolveHistory />}
    </>
  );
}

export default App;
