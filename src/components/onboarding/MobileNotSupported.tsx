import { Smartphone, ArrowRight, LogOut, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signOut } from '@/utils/auth';

interface MobileNotSupportedProps {
  onTryDemo: () => void;
}

/**
 * Screen shown to users on mobile devices.
 * Explains that LeetTracker is not fully supported on mobile and offers demo option.
 */
export function MobileNotSupported({ onTryDemo }: MobileNotSupportedProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4 pb-6 pt-8">
          <div className="flex justify-center">
            <div className="p-4 bg-orange-500/10 rounded-full">
              <Smartphone className="h-12 w-12 text-orange-500" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl">Mobile Not Fully Supported</CardTitle>
            <CardDescription>LeetTracker is optimized for desktop browsers</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          <Alert className="border-orange-500 bg-orange-500/5">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="ml-2">
              <strong>Desktop experience recommended.</strong> LeetTracker is designed for desktop
              use and may not work properly on mobile devices.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 pt-2">
            <h3 className="font-semibold text-lg">Why Desktop?</h3>
            <p className="text-sm text-muted-foreground">
              LeetTracker requires a Chrome extension that runs alongside your LeetCode sessions.
              Chrome extensions are not supported on mobile browsers, and the interface is optimized
              for larger screens where you typically solve coding problems.
            </p>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Smartphone className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">For the Best Experience</p>
                <p className="text-sm text-muted-foreground">
                  Use LeetTracker on a desktop or laptop with Chrome, Edge, Brave, or another
                  Chromium-based browser
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              While you can explore the demo on mobile, please note that some features may not work
              correctly and the layout may not be optimal for smaller screens.
            </p>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold text-lg mb-3">Want to see how it works?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You can try our demo on mobile, but be aware that the experience is not optimized for
              mobile devices.
            </p>
            <Button onClick={onTryDemo} className="w-full gap-2">
              <ArrowRight className="h-5 w-5" />
              Try Demo (Limited on Mobile)
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground pt-4">
            For the full LeetTracker experience, please visit us on a desktop browser.
          </p>

          {/* Sign Out Footer */}
          <div className="flex justify-center pt-6 border-t">
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
