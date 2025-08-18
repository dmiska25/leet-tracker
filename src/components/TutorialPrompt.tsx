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
      <div className="max-w-md w-full rounded-lg border bg-card p-6 shadow-2xl">
        <h3 className="text-lg font-semibold mb-2">Take a quick tutorial?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Learn how LeetTracker estimates category progress, suggests problems, and records solves.
          You can exit at any time. We&apos;ll use the demo data so you can see everything
          populated.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onLater}>
            Maybe later
          </Button>
          <Button variant="outline" onClick={onNever}>
            Don&apos;t show again
          </Button>
          <Button onClick={onStart}>Start tutorial</Button>
        </div>
      </div>
    </div>
  );
}
