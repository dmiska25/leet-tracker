import { Chrome, ArrowRight, LogOut, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { signOut } from '@/utils/auth';

interface BrowserNotSupportedProps {
  onTryDemo: () => void;
}

/**
 * Screen shown to users on non-Chromium browsers.
 * Explains that LeetTracker requires Chrome and offers demo option.
 */
export function BrowserNotSupported({ onTryDemo }: BrowserNotSupportedProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4 pb-6 pt-8 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-orange-500/10 p-4">
              <AlertTriangle className="h-12 w-12 text-orange-500" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">Chromium Browser Required</CardTitle>
            <CardDescription>
              LeetTracker requires a Chrome browser extension to function
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-8 pb-8">
          {/* Warning Box */}
          <div className="flex items-start gap-2 rounded-lg border border-orange-500 bg-orange-500/5 p-4">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <div className="ml-2 text-sm">
              <strong>Chromium-based browser required.</strong> LeetTracker uses a Chrome extension
              to sync your LeetCode progress in the background.
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-4 pt-2">
            {/* Compatible Browsers Box */}
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
              <Chrome className="mt-0.5 h-5 w-5 text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Compatible Browsers</p>
                <p className="text-sm text-muted-foreground">
                  Google Chrome, Microsoft Edge, Brave, Opera, Samsung Internet, and other
                  Chromium-based browsers
                </p>
              </div>
            </div>
          </div>

          {/* Demo CTA */}
          <div className="border-t pt-4">
            <h3 className="mb-3 text-lg font-semibold">Want to see how it works?</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Try our demo to explore LeetTracker&apos;s features without installing the extension.
            </p>
            <button
              onClick={onTryDemo}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              <ArrowRight className="h-5 w-5" />
              Try Demo
            </button>
          </div>

          {/* Privacy Note */}
          <p className="pt-4 text-center text-sm text-muted-foreground">
            Your data is synced locally and never leaves your browser without your permission.
          </p>

          {/* Sign Out Footer */}
          <div className="flex justify-center border-t pt-6">
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
