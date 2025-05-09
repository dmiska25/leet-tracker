import { FormEvent, useState } from 'react';
import { db } from '@/storage/db';
import { Button } from '@/components/ui/button';

function InfoBox({ className }: { className?: string }) {
  return (
    <div
      className={`w-full space-y-2 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground ${className}`}
    >
      <p>
        <strong className="font-medium text-foreground">Heads up!</strong> Please Note: This
        application does not store your data remotely. All your data is stored locally in your
        browser. Clearing your browser data will remove all your data from this application.
      </p>
      <p>
        In addition, due to current API limitations, only your 20 most recent solves can be pulled
        at any given time. A solution is planned in the future to support full solve history.
      </p>
    </div>
  );
}

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await db.setUsername(trimmed);
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
        </form>

        {/* Invisible Placeholder to ensure sign in is centered */}
        <InfoBox className="invisible" />
      </div>
    </div>
  );
}
