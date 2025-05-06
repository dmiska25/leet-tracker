import { FormEvent, useState } from 'react';
import { db } from '@/storage/db';
import { Button } from '@/components/ui/button';

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
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-card p-6 rounded-lg shadow"
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
    </div>
  );
}
