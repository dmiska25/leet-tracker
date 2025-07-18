import clsx from 'clsx';
import { ModeBadge } from '@/components/ModeBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { db } from '@/storage/db';

type View = 'dashboard' | 'history';

interface Props {
  view: View;
  onChange: (_: View) => void;
}

export default function HeaderNav({ view, onChange }: Props) {
  /* ---------- helpers ---------- */
  const NavBtn = ({ value, label }: { value: View; label: string }) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={clsx(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium',
        view === value
          ? 'bg-background text-foreground shadow'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out? Your local progress will be cleared.'))
      return;
    try {
      await db.withTransaction(
        ['solves', 'goal-profiles', 'active-goal-profile', 'extension-sync', 'leetcode-username'],
        async (_) => {
          // Clear all user-related data
          await db.setActiveGoalProfile('default');
          await db.clearGoalProfiles();
          await db.setUsername('');
          await db.clearSolves();
          await db.setExtensionLastTimestamp(0);
        },
      );
    } catch (err) {
      console.error('Failed to clear user data:', err);
      alert('An error occurred while signing out. Please try again.');
    }
    window.location.reload();
  };

  /* ---------- render ---------- */
  return (
    <nav className="border-b bg-card">
      <div className="max-w-6xl mx-auto flex h-16 items-center px-4 sm:px-6">
        {/* Logo + mode pill */}
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">LeetTracker</h1>
          <ModeBadge />
        </div>

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-4">
          {/* View selector */}
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 hidden sm:flex">
            <NavBtn value="dashboard" label="Dashboard" />
            <NavBtn value="history" label="Solve History" />
          </div>

          <ThemeToggle />
          <Button variant="ghost" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
