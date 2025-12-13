import { useState, useEffect } from 'react';
import { Chrome, Download, Loader2, ArrowRight, RefreshCw, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { checkExtensionInstalled } from '@/api/extensionBridge';
import { signOut } from '@/utils/auth';
import { db } from '@/storage/db';
import {
  trackExtensionInstallViewed,
  trackExtensionInstallClicked,
  trackExtensionDetected,
} from '@/utils/analytics';

interface ExtensionInstallProps {
  onContinue: (_skipped: boolean) => void;
}

/**
 * First screen of onboarding flow - checks for extension installation.
 * If extension is detected, auto-continues to next step.
 * If not detected, gives user option to install or skip (try demo).
 */
export function ExtensionInstall({ onContinue }: ExtensionInstallProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    // Track page view
    const trackView = async () => {
      const username = await db.getUsername();
      if (username) {
        trackExtensionInstallViewed(username);
      }
    };
    trackView();

    // Check for extension presence once on mount
    const checkExtension = async () => {
      const isInstalled = await checkExtensionInstalled();

      if (!mounted) return;

      if (isInstalled) {
        // Extension is installed
        setIsExtensionInstalled(true);
        setIsChecking(false);

        // Track detection
        const username = await db.getUsername();
        if (username) {
          trackExtensionDetected();
        }

        // Auto-continue after a brief delay if extension is detected
        timeoutId = window.setTimeout(() => {
          if (mounted) {
            onContinue(false);
          }
        }, 1500);
      } else {
        // Extension not available
        setIsExtensionInstalled(false);
        setIsChecking(false);
      }
    };

    checkExtension();

    return () => {
      mounted = false;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [onContinue]);

  const handleInstallExtension = async () => {
    const username = await db.getUsername();
    if (username) {
      trackExtensionInstallClicked(username);
    }
    const installUrl = import.meta.env.VITE_EXTENSION_URL;
    window.open(installUrl, '_blank');
  };

  const handleTryDemo = () => {
    onContinue(true); // Pass true to indicate user skipped extension
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4 pb-6 pt-8">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Chrome className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">Welcome to LeetTracker!</CardTitle>
            <CardDescription className="text-base">
              To get started, you&apos;ll need our Chrome extension to track your progress
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          {/* Checking Status */}
          {isChecking && (
            <Alert className="border-blue-500 bg-blue-500/5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <AlertDescription className="ml-2">
                Checking for extension installation...
              </AlertDescription>
            </Alert>
          )}

          {/* Extension Detected */}
          {!isChecking && isExtensionInstalled && (
            <Alert className="border-green-500 bg-green-500/5">
              <Chrome className="h-4 w-4 text-green-500" />
              <AlertDescription className="ml-2">
                <strong>Extension detected!</strong> Proceeding to next step...
              </AlertDescription>
            </Alert>
          )}

          {/* Extension Not Detected */}
          {!isChecking && !isExtensionInstalled && (
            <Alert className="border-orange-500 bg-orange-500/5 flex items-center justify-between">
              <div className="flex items-start gap-2">
                <Chrome className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <AlertDescription>
                  <strong>Extension not detected.</strong> Install it to unlock all features.
                </AlertDescription>
              </div>
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10 ml-4 flex-shrink-0"
              >
                Refresh
                <RefreshCw className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          {/* Features List */}
          <div className="space-y-4 pt-2">
            <h3 className="font-semibold text-lg">What the extension does:</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Automatic Progress Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Your solved problems are automatically synced as you practice
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Code Evolution Snapshots</p>
                  <p className="text-sm text-muted-foreground">
                    Watch how your solution evolved with automatic code snapshots
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Smart Recommendations</p>
                  <p className="text-sm text-muted-foreground">
                    Get personalized problem recommendations based on your progress
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Performance Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    Track your solve times and improvement over time
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={handleInstallExtension} className="flex-1 gap-2" disabled={isChecking}>
              <Download className="h-5 w-5" />
              Install Chrome Extension
            </Button>
            <Button
              onClick={handleTryDemo}
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
              disabled={isChecking || isExtensionInstalled}
            >
              <ArrowRight className="h-5 w-5" />
              Try Demo Without Extension
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-2">
            The extension is required to automatically track your LeetCode progress and unlock all
            features.
          </p>

          {/* Sign Out Button */}
          <div className="text-center pt-4 border-t mt-6">
            <Button
              onClick={() => signOut()}
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
