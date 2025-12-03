import { useState, useEffect } from 'react';
import {
  Loader2,
  ExternalLink,
  CheckCircle2,
  Database,
  AlertCircle,
  LogOut,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { db } from '@/storage/db';
import { checkForValidManifest, monitorSyncProgress } from '@/domain/onboardingSync';
import { signOut } from '@/utils/auth';
import {
  trackDataSyncStarted,
  trackDataSyncCompleted,
  trackDataSyncError,
} from '@/utils/analytics';

interface DataSyncProps {
  onComplete: () => void;
  username: string;
}

/**
 * Second screen of onboarding flow - monitors data sync progress.
 * First checks for user manifest from extension (confirms user is logged in).
 * Then monitors sync progress using total and totalSynced from extension manifest.
 */
export function DataSync({ onComplete, username }: DataSyncProps) {
  const [syncStatus, setSyncStatus] = useState<'waiting' | 'syncing' | 'complete'>('waiting');
  const [syncProgress, setSyncProgress] = useState(0);
  const [totalSolves, setTotalSolves] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);

  // Track data sync started when component mounts
  useEffect(() => {
    trackDataSyncStarted(username);
  }, [username]);

  // Poll for manifest to detect when user has visited LeetCode
  useEffect(() => {
    if (syncStatus !== 'waiting') return;

    const checkForManifest = async () => {
      const { hasManifest, total } = await checkForValidManifest(username);

      if (hasManifest) {
        // Valid manifest detected! Set total and transition to syncing state
        if (total !== null) {
          setTotalSolves(total);
        }
        setSyncStartTime(Date.now());
        setSyncStatus('syncing');
      }
    };

    // Check immediately
    checkForManifest();

    // Then poll every 2 seconds
    const interval = setInterval(checkForManifest, 2000);
    return () => clearInterval(interval);
  }, [syncStatus, username]);

  // Monitor sync progress when in syncing state
  useEffect(() => {
    if (syncStatus !== 'syncing') return;

    const checkProgress = async () => {
      const result = await monitorSyncProgress(username);

      // Update total if we got a new value
      if (result.total !== null && result.total !== totalSolves) {
        setTotalSolves(result.total);
      }

      // Update progress
      setSyncProgress(result.progress);

      // Handle errors - set error if present, clear if recovered
      if (result.error) {
        if (!syncError) {
          // New error - track it
          trackDataSyncError(username, result.error);
        }
        setSyncError(result.error);
      } else if (syncError) {
        // Clear error state if we've recovered
        setSyncError(null);
      }

      // Check if complete
      if (result.status === 'complete') {
        setSyncStatus('complete');

        // Track completion - fire and forget (don't block on it)
        const syncTimeMs = syncStartTime ? Date.now() - syncStartTime : 0;
        const problemCount = result.total ?? 0;
        db.getAllSolves().then((solves) => {
          trackDataSyncCompleted(username, syncTimeMs, problemCount, solves.length);
        });

        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    };

    // Check immediately
    checkProgress();

    // Then poll every 3000ms for progress updates
    const interval = setInterval(checkProgress, 3000);
    return () => clearInterval(interval);
  }, [syncStatus, totalSolves, onComplete, username, syncError, syncStartTime]);

  const handleGoToLeetCode = () => {
    window.open('https://leetcode.com/problems/two-sum/', '_blank');
  };

  const handleTryDemo = async () => {
    await db.clearUsername();
    // Set demo username
    const demoUsername = import.meta.env.VITE_DEMO_USERNAME || 'demo-user';
    await db.setUsername(demoUsername);
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4 pb-6 pt-8">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Database className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">Sync Your LeetCode Data</CardTitle>
            <CardDescription>
              We need to sync your LeetCode progress to provide personalized recommendations
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          {/* Waiting for Sync */}
          {syncStatus === 'waiting' && (
            <>
              <Alert className="border-blue-500 bg-blue-500/5">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <AlertDescription className="ml-2">
                  Waiting for sync to begin... Visit LeetCode to start syncing your data.
                </AlertDescription>
              </Alert>

              <div className="space-y-4 pt-2">
                <h3 className="font-semibold text-lg">How to sync your data:</h3>
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="text-sm">
                    Click the button below to visit LeetCode
                    <p className="text-muted-foreground ml-6 mt-1">
                      The extension will automatically detect your visit
                    </p>
                  </li>
                  <li className="text-sm">
                    Ensure you are logged in as <strong>{username}</strong>
                    <p className="text-muted-foreground ml-6 mt-1">
                      This allows the extension to capture your data
                    </p>
                  </li>
                  <li className="text-sm">
                    Browse your problem list or solve a problem
                    <p className="text-muted-foreground ml-6 mt-1">This allows the sync to run</p>
                  </li>
                  <li className="text-sm">
                    Return to this tab
                    <p className="text-muted-foreground ml-6 mt-1">
                      We&apos;ll automatically detect when syncing starts
                    </p>
                  </li>
                </ol>
              </div>

              <Button onClick={handleGoToLeetCode} className="w-full gap-2 mt-2">
                <ExternalLink className="h-5 w-5" />
                Go to LeetCode
              </Button>
            </>
          )}

          {/* Syncing in Progress */}
          {syncStatus === 'syncing' && (
            <>
              <Alert className="border-blue-500 bg-blue-500/5">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <AlertDescription className="ml-2">
                  <strong>Syncing your data...</strong> This may take a few moments.
                </AlertDescription>
              </Alert>

              {syncError && (
                <Alert className="border-orange-500 bg-orange-500/5">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <AlertDescription className="ml-2">
                    Error detected during sync. Please ensure the extension is installed or try
                    reinstalling it.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Sync Progress</span>
                  <span className="text-muted-foreground">{syncProgress}%</span>
                </div>
                <ProgressBar value={syncProgress} />
              </div>

              <div className="space-y-2 text-sm text-muted-foreground pt-2">
                <p>⏳ Fetching your solved problems...</p>
                <p>⏳ Analyzing problem categories...</p>
                <p>⏳ Calculating your progress...</p>
              </div>

              {/* Important: Keep browsing LeetCode during sync */}
              <Alert className="border-yellow-500 bg-yellow-500/5 mt-4">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="ml-2">
                  <strong>Stay on LeetCode!</strong> Keep browsing LeetCode problems to ensure all
                  your data is synced properly.
                </AlertDescription>
              </Alert>

              <Button onClick={handleGoToLeetCode} variant="outline" className="w-full gap-2 mt-2">
                <ExternalLink className="h-5 w-5" />
                Browse LeetCode Problems
              </Button>
            </>
          )}

          {/* Sync Complete */}
          {syncStatus === 'complete' && (
            <>
              <Alert className="border-green-500 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="ml-2">
                  <strong>Sync complete!</strong> Your data has been successfully imported.
                </AlertDescription>
              </Alert>

              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-muted-foreground">Redirecting to your dashboard...</p>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground pt-4">
            Your data is synced locally and never leaves your browser without your permission.
          </p>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
            {/* Show "Try Demo" only during syncing */}
            {syncStatus === 'syncing' && (
              <Button
                onClick={handleTryDemo}
                variant="outline"
                size="sm"
                className="flex-1 gap-2 bg-transparent"
              >
                <ArrowRight className="h-4 w-4" />
                Check out demo while you wait
              </Button>
            )}

            {/* Sign Out always available except when complete */}
            {syncStatus !== 'complete' && (
              <Button
                onClick={() => signOut()}
                variant="ghost"
                size="sm"
                className={`gap-2 text-muted-foreground hover:text-foreground ${syncStatus === 'syncing' ? 'flex-1' : 'w-full'}`}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
