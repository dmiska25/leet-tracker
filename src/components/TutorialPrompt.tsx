import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onStart: () => void;
  onLater: () => void; // dismiss for now
  onNever: () => void; // mark seen
}

export default function TutorialPrompt({ open, onStart, onLater, onNever }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50">
      <div
        className="max-w-md w-full rounded-lg border bg-card p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-prompt-title"
      >
        <h3 id="tutorial-prompt-title" className="text-lg font-semibold mb-2">
          Welcome to LeetTracker!
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Instead of randomly grinding problems, LeetTracker helps you take a systematic approach to
          interview prep by tracking progress across categories, identifying knowledge gaps, and
          suggesting the most impactful problems to solve next.
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Learn how to use this strategic approach effectively with a quick tutorial.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onLater}>
            Maybe later
          </Button>
          <Button variant="outline" onClick={onNever}>
            Don&apos;t show again
          </Button>
          <Button onClick={onStart} autoFocus>
            Start tutorial
          </Button>
        </div>
      </div>
    </div>
  );
}
