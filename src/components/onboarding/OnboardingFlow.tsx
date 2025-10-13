import { useState } from 'react';
import { ExtensionInstall } from './ExtensionInstall';
import { BrowserNotSupported } from './BrowserNotSupported';
import { MobileNotSupported } from './MobileNotSupported';
import { DataSync } from './DataSync';
import { db } from '@/storage/db';
import { setPrevUser, markOnboardingComplete } from '@/storage/db';
import { isChromiumBrowser, isMobileBrowser } from '@/domain/browserDetection';

interface OnboardingFlowProps {
  onComplete: () => void;
  username: string;
}

/**
 * Main onboarding flow component.
 * Orchestrates onboarding steps:
 * 1. Mobile check (show limited support message for mobile devices)
 * 2. Browser check (show unsupported message for non-Chromium browsers)
 * 3. Extension installation check (with option to skip and use demo)
 * 4. Data sync monitoring (only if extension was installed)
 */
export function OnboardingFlow({ onComplete, username }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<'extension' | 'sync'>('extension');
  const [skippedExtension, setSkippedExtension] = useState(false);

  const demoUsername = import.meta.env.VITE_DEMO_USERNAME || 'leet-tracker-demo-user';
  const isChromium = isChromiumBrowser();
  const isMobile = isMobileBrowser();

  const handleExtensionContinue = async (skipped: boolean) => {
    setSkippedExtension(skipped);

    if (skipped) {
      // User chose to skip and use demo
      // Switch to demo user
      await setPrevUser(username);
      await db.setUsername(demoUsername);
      // Mark onboarding complete for demo user
      await markOnboardingComplete(demoUsername);
      // Reload to load demo data
      window.location.reload();
    } else {
      // If user installed extension, proceed to sync
      setCurrentStep('sync');
    }
  };

  const handleTryDemo = async () => {
    // Same as skipping extension installation
    await handleExtensionContinue(true);
  };

  const handleSyncComplete = () => {
    onComplete();
  };

  // Show mobile not supported screen first (highest priority)
  if (isMobile) {
    return <MobileNotSupported onTryDemo={handleTryDemo} />;
  }

  // Show browser not supported screen for non-Chromium browsers
  if (!isChromium) {
    return <BrowserNotSupported onTryDemo={handleTryDemo} />;
  }

  if (currentStep === 'extension') {
    return <ExtensionInstall onContinue={handleExtensionContinue} />;
  }

  if (currentStep === 'sync' && !skippedExtension) {
    return <DataSync onComplete={handleSyncComplete} username={username} />;
  }

  return null;
}
