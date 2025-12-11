import { useState, useEffect, useRef } from 'react';
import type { GoalProfile } from '@/types/types';
import { RefreshCcw, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useInitApp } from '@/hooks/useInitApp';
import { ProfileManager } from '@/components/ProfileManager';
import { getCategorySuggestions, getRandomSuggestions } from '@/domain/recommendations';
import { CategoryRecommendation } from '@/types/recommendation';
import { db } from '@/storage/db';
import { trackSyncCompleted } from '@/utils/analytics';
import { triggerManualSync } from '@/domain/extensionPoller';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTimeAgo } from '@/hooks/useTimeAgo';
import ProblemCards from './ProblemCards';
import type { Category } from '@/types/types';

export const RANDOM_TAG: Category = 'Random';
const initialSuggestions = {} as Record<Category, CategoryRecommendation>;

export default function Dashboard() {
  const { loading, username, progress, refresh, silentRefresh, criticalError } = useInitApp();
  const [open, setOpen] = useState<Category | null>(null);
  const [suggestions, setSuggestions] =
    useState<Record<Category, CategoryRecommendation>>(initialSuggestions);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [profileManagerOpen, setProfileManagerOpen] = useState(false);

  // Listen for updates from the global poller (managed by App.tsx)
  // Use silentRefresh to avoid loading spinner flash when data updates automatically
  useEffect(() => {
    const handleSolvesUpdated = async (event: Event) => {
      const count = (event as CustomEvent<number>).detail;
      console.log(`[Dashboard] ${count} new solves detected, refreshing UI silently`);
      await silentRefresh();
      setLastSynced(new Date());
    };

    window.addEventListener('solves-updated', handleSolvesUpdated);
    return () => window.removeEventListener('solves-updated', handleSolvesUpdated);
  }, [silentRefresh]);

  // Profile selector
  const [profiles, setProfiles] = useState<GoalProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const timeAgo = useTimeAgo(lastSynced);

  // Handle click outside and Escape key for profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
      }
    };

    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileOpen]);

  /* update the last-synced timestamp once initial data is ready */
  useEffect(() => {
    if (!loading) setLastSynced(new Date());
  }, [loading]);

  // Fetch saved profiles + active profile ID
  const loadProfiles = async () => {
    const list = await db.getAllGoalProfiles();
    setProfiles(list);
    const activeId = await db.getActiveGoalProfileId();
    setActiveProfileId(activeId ?? list[0]?.id);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  }

  if (!username) {
    return <p className="p-6">Please sign in to start tracking your solves.</p>;
  }

  const sorted = [...progress].sort((a, b) => a.adjustedScore - b.adjustedScore);

  /* ----- events ----- */

  const handleToggle = async (tag: Category) => {
    if (open === tag) return setOpen(null);
    setOpen(tag);
    if (!suggestions[tag]) {
      const rec =
        tag === RANDOM_TAG
          ? await getRandomSuggestions(
              progress.map((p) => p.tag),
              5,
            )
          : await getCategorySuggestions(tag, 5);
      setSuggestions((s) => ({ ...s, [tag]: rec }));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    const beforeCount = (await db.getAllSolves()).length;
    const start = performance.now();
    try {
      // Trigger manual sync via the global poller
      const newSolvesCount = await triggerManualSync();

      if (newSolvesCount > 0) {
        // Only refresh if new solves were found
        await refresh();
      }

      const afterCount = (await db.getAllSolves()).length;
      const durationMs = performance.now() - start;
      // Extension is now required, so always true
      trackSyncCompleted(afterCount - beforeCount, durationMs, true);
      setLastSynced(new Date());
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectProfile = async (id: string) => {
    if (id === activeProfileId) {
      setProfileOpen(false);
      return;
    }
    await db.setActiveGoalProfile(id);
    setActiveProfileId(id);
    setProfileOpen(false);
    await refresh();
    setSuggestions(initialSuggestions);
    setOpen(null);
    setLastSynced(new Date());
  };

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-background">
      {/* Profile manager modal */}
      {profileManagerOpen && (
        <ProfileManager
          onDone={async () => {
            setProfileManagerOpen(false);
            await loadProfiles();
            await refresh();
            setLastSynced(new Date());
          }}
        />
      )}

      {/* ───────── Main Content ───────── */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">Hello, {username}!</h2>
            <p className="text-muted-foreground">Your category progress</p>
            <p className="text-xs text-muted-foreground">Last synced: {timeAgo}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Profile controls wrapper */}
            <div className="flex items-center gap-2" data-tour="profile-controls">
              {/* Profile selector */}
              <div className="relative" ref={profileDropdownRef}>
                <Button
                  variant="outline"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="px-3 py-2"
                  aria-expanded={profileOpen}
                  aria-haspopup="listbox"
                >
                  Profile:{' '}
                  {profiles.find((p) => p.id === activeProfileId)?.name ?? 'Select profile'}
                </Button>
                {profileOpen && (
                  <div
                    className="absolute right-0 z-20 mt-1 w-44 max-h-60 overflow-y-auto rounded-md border bg-card shadow"
                    role="listbox"
                    aria-label="Profile selection"
                  >
                    {profiles.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProfile(p.id)}
                        className={`block w-full text-left px-3 py-1.5 text-sm ${
                          p.id === activeProfileId ? 'bg-muted font-medium' : 'hover:bg-muted'
                        }`}
                        role="option"
                        aria-selected={p.id === activeProfileId}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Manage Profiles */}
              <Button variant="outline" onClick={() => setProfileManagerOpen(true)}>
                Manage Profiles
              </Button>
            </div>
            {/* Sync button */}
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 sync-now-btn"
            >
              <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        </header>

        {/* Category list */}
        <Card className="progress-score-card">
          <CardHeader className="px-4 py-2">
            <CardTitle>Problem Categories</CardTitle>
            <CardDescription>Categories sorted by completion (lowest first)</CardDescription>
          </CardHeader>

          <CardContent className="divide-y px-4">
            {/* Error banner */}
            {criticalError && (
              <div className="p-6 text-sm text-destructive">
                Progress data could not be loaded. Try syncing again using the&nbsp;
                <strong>&quot;Sync&nbsp;Now&quot;</strong> button above.
              </div>
            )}

            {!criticalError && (
              <>
                {/* Random category row */}
                <div key="random" className="py-4 space-y-3">
                  <button
                    className="w-full text-left space-y-2"
                    onClick={() => handleToggle(RANDOM_TAG)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2">
                      <div className="w-[180px] flex items-center gap-2 pl-1 whitespace-normal break-words">
                        <ChevronDown
                          className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                            open === RANDOM_TAG ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                        <span>{RANDOM_TAG}</span>
                      </div>
                    </div>
                  </button>

                  <div
                    className={clsx(
                      'overflow-hidden transition-all duration-300 origin-top',
                      open === RANDOM_TAG ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
                    )}
                  >
                    {suggestions[RANDOM_TAG] && (
                      <Tabs defaultValue="fundamentals" className="mt-4 w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
                          <TabsTrigger value="refresh">Refresh</TabsTrigger>
                          <TabsTrigger value="new">New</TabsTrigger>
                        </TabsList>

                        {(['fundamentals', 'refresh', 'new'] as const).map((bucket) => (
                          <TabsContent key={bucket} value={bucket} className="mt-4">
                            <ProblemCards
                              problems={suggestions[RANDOM_TAG][bucket]}
                              bucket={bucket}
                              showTags={false}
                            />
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </div>
                </div>

                {/* Category rows */}
                {sorted.map((cat, index) => {
                  const percent = Math.round(cat.adjustedScore * 100);
                  const goalPercent = Math.round(cat.goal * 100);
                  const isOpen = open === cat.tag;

                  return (
                    <div
                      key={cat.tag}
                      className="py-4 space-y-3"
                      {...(index === 0 ? { 'data-tour': 'category-row-0' } : {})}
                    >
                      {/* Summary row */}
                      <button
                        className="w-full text-left space-y-2"
                        onClick={() => handleToggle(cat.tag)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2">
                          {/* Category name – fixed width so bars align */}
                          <div className="w-[180px] flex items-center gap-2 pl-1 whitespace-normal break-words">
                            <ChevronDown
                              className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : 'rotate-0'
                              }`}
                            />
                            <span>{cat.tag}</span>
                          </div>

                          {/* Percentage, goal and progress bar */}
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{percent}%</span>
                              <span className="text-muted-foreground">Goal: {goalPercent}%</span>
                            </div>
                            <div className="relative">
                              <ProgressBar value={percent} />
                              <div
                                className="absolute top-0 h-2 border-r-2 border-primary/60"
                                style={{ left: `${goalPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Detail – tabbed recommendations */}
                      <div
                        className={clsx(
                          'overflow-hidden transition-all duration-300 origin-top',
                          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
                        )}
                      >
                        {suggestions[cat.tag] && (
                          <Tabs defaultValue="fundamentals" className="mt-4 w-full">
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
                              <TabsTrigger value="refresh">Refresh</TabsTrigger>
                              <TabsTrigger value="new">New</TabsTrigger>
                            </TabsList>

                            {(['fundamentals', 'refresh', 'new'] as const).map((bucket) => (
                              <TabsContent key={bucket} value={bucket} className="mt-4">
                                <ProblemCards
                                  problems={suggestions[cat.tag][bucket]}
                                  bucket={bucket}
                                />
                              </TabsContent>
                            ))}
                          </Tabs>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
