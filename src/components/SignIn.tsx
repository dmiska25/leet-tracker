import { FormEvent, useState } from 'react';
import { db } from '@/storage/db';
import { Button } from '@/components/ui/button';
import { verifyUser } from '@/api/leetcode';
import { trackUserSignedIn } from '@/utils/analytics';
import { useToast } from './ui/toast';

const DEMO_USERNAME = import.meta.env.VITE_DEMO_USERNAME;

function InfoBox({ className }: { className?: string }) {
  return (
    <div
      className={`w-full space-y-2 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground ${className}`}
    >
      <p>
        <strong className="font-medium text-foreground">Heads up!</strong> This application does not
        store your data remotely. All your data is stored locally in your browser. Clearing your
        browser data will remove all your data from this application.
      </p>
    </div>
  );
}

export default function SignIn() {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    if (saving) return;
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      // Verify if the user exists
      try {
        const res = await verifyUser(trimmed);
        if (!res.exists) {
          setSaving(false);
          toast('User not found. Please check your username and try again.', 'error');
          return;
        }
      } catch (err) {
        console.error('[SignIn] an error occurred while verifying user', err);
        setSaving(false);
        toast('An unexpected error occurred. Please try again later.', 'error');
        return;
      }

      // Save the username to the database
      await db.setUsername(trimmed);
      trackUserSignedIn(false);
      // A full reload is simplest to re‑run initApp with the new username
      window.location.reload();
    } catch (err) {
      console.error('[SignIn] failed to save username', err);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="relative w-full max-w-sm">
        {/* Visible Info Box */}
        <InfoBox />

        {/* Sign-in form */}
        <form
          onSubmit={handleSubmit}
          className="relative w-full space-y-4 bg-card p-6 rounded-lg shadow"
        >
          <h1 className="text-2xl font-bold text-center">Leet Tracker</h1>
          <label htmlFor="username" className="block text-sm font-medium">
            LeetCode username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border px-3 py-2 outline-none bg-background"
            placeholder="e.g. johndoe"
            disabled={saving}
          />
          <Button type="submit" className="w-full" disabled={saving || username.trim() === ''}>
            {saving ? 'Signing in…' : 'Sign in'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              setSaving(true);
              await db.setUsername(DEMO_USERNAME);
              trackUserSignedIn(true);
              setSaving(false);
              window.location.reload();
            }}
          >
            Try Demo
          </Button>
        </form>

        {/* Invisible Placeholder to ensure sign in is centered */}
        <InfoBox className="invisible" />
      </div>
    </div>
  );
}
