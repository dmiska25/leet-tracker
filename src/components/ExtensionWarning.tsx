import { useState, useEffect } from 'react';
import { X, Download, Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';

interface ExtensionWarningProps {
  /** Whether the Chrome extension is already installed */
  extensionInstalled: boolean;
  /** Extra Tailwind classes for layout spacing, etc. */
  className?: string;
}

/**
 * Displays a dismissible warning banner when the LeetTracker Chrome extension is not detected.
 *
 * The warning informs users that their submission history may be incomplete without the extension and provides options to install the extension or dismiss the warning. Dismissal is persisted in localStorage for 24 hours. The banner is hidden on screens narrower than 768px.
 *
 * @param extensionInstalled - Whether the Chrome extension is currently installed
 * @param className - Optional additional CSS classes for styling the warning banner
 * @returns The warning banner element, or null if the extension is installed or the warning has been dismissed
 */
export function ExtensionWarning({ extensionInstalled, className }: ExtensionWarningProps) {
  const [dismissed, setDismissed] = useState(false);

  /* Check persisted dismissal state on mount */
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('leettracker-extension-warning-dismissed-until');
    if (dismissedUntil && new Date() < new Date(dismissedUntil)) {
      setDismissed(true);
    }
  }, []);

  /* Early-out: nothing to show */
  if (extensionInstalled || dismissed) return null;

  const installUrl = import.meta.env.VITE_EXTENSION_URL;

  const handleDismiss = () => {
    setDismissed(true);
    const oneDayLater = new Date();
    oneDayLater.setDate(oneDayLater.getDate() + 1);
    localStorage.setItem(
      'leettracker-extension-warning-dismissed-until',
      oneDayLater.toISOString(),
    );
  };

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .warning {
              display: none;
            }
          }
        `}
      </style>

      <div
        className={clsx(
          'warning flex items-start justify-between gap-4 rounded-md border border-leetcode-orange bg-leetcode-orange/5 p-4',
          className,
        )}
      >
        {/* Message */}
        <div className="flex items-center gap-2 flex-1">
          <Chrome className="h-5 w-5 text-leetcode-orange flex-shrink-0" />
          <span className="text-sm flex-1">
            <strong>LeetTracker Chrome extension not detected.</strong>&nbsp; Your submission
            history may be incomplete. This app works best with the extension to provide accurate
            progress tracking and recommendations.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 flex-shrink-0 self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(installUrl, '_blank')}
            className="gap-1 border-leetcode-orange text-leetcode-orange hover:bg-leetcode-orange/10 px-4 py-2"
          >
            <Download className="h-4 w-4" />
            Install Extension
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss extension warning"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </>
  );
}
