import { useState, useEffect } from 'react';
import type { GoalProfile } from '@/types/types';
import { RefreshCcw, ExternalLink } from 'lucide-react';
import clsx from 'clsx';
import { useInitApp } from '@/hooks/useInitApp';
import { ProfileManager } from '@/components/ProfileManager';
import { getCategorySuggestions, getRandomSuggestions } from '@/domain/recommendations';
import { CategoryRecommendation } from '@/types/recommendation';
import { db } from '@/storage/db';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ModeBadge } from '@/components/ModeBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTimeAgo } from '@/hooks/useTimeAgo';

/* ---------- Helpers ---------- */

function DifficultyBadge({ level }: { level: string }) {
  const lvl = level.toLowerCase();
  const classes =
    lvl === 'easy'
      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
      : lvl === 'medium'
        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        : 'bg-rose-100 text-rose-800 hover:bg-rose-200';

  const label = lvl.charAt(0).toUpperCase() + lvl.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors ${classes}`}
    >
      {label}
    </span>
  );
}

/* ---------- "Last solved …” pill ---------- */

function LastSolvedLabel({ ts }: { ts: number }) {
  const ago = useTimeAgo(new Date(ts * 1000));
  return (
    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
      Last solved {ago}
    </span>
  );
}

/* ---------- Main Component ---------- */

export default function Dashboard() {
  const { loading, username, progress, refresh, criticalError } = useInitApp();
  const [open, setOpen] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, CategoryRecommendation>>({});
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [profileManagerOpen, setProfileManagerOpen] = useState(false);

  // Profile selector
  const [profiles, setProfiles] = useState<GoalProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | undefined>(undefined);
  const [profileOpen, setProfileOpen] = useState(false);
  const timeAgo = useTimeAgo(lastSynced);

  /* update the last‑synced timestamp once initial data is ready */
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

  const handleToggle = async (tag: string) => {
    if (open === tag) return setOpen(null);
    setOpen(tag);
    if (!suggestions[tag]) {
      const rec =
        tag === 'Random'
          ? await getRandomSuggestions(
              progress.map((p) => p.tag as any),
              5,
            )
          : await getCategorySuggestions(tag as any, 5);
      setSuggestions((s) => ({ ...s, [tag]: rec }));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await refresh();
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
    setSuggestions({});
    setOpen(null);
    setLastSynced(new Date());
  };

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out? Your local progress will be cleared.'))
      return;
    await db.setUsername('');
    await db.clearSolves();
    window.location.reload();
  };

  /* ---------- render ---------- */

  return (
    <div className="min-h-screen bg-background">
      {/* ───────── Nav Bar ───────── */}
      <nav className="border-b bg-card">
        <div className="max-w-6xl mx-auto flex h-16 items-center px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">LeetTracker</h1>
            <ModeBadge />
          </div>
          <div className="ml-auto flex items-center gap-4">
            {/* top‑level tabs (placeholder – navigation not wired yet) */}
            <Tabs defaultValue="dashboard" className="mr-4 hidden sm:block">
              <TabsList>
                <TabsTrigger value="dashboard" disabled>
                  Dashboard
                </TabsTrigger>
                <div id="solveHistoryTooltip">
                  <TabsTrigger value="history" disabled>
                    Solve History
                  </TabsTrigger>
                </div>
                <Tooltip
                  anchorId="solveHistoryTooltip"
                  content="Work in progress"
                  place="top"
                  className="rounded-md bg-black text-white px-2 py-1 text-sm shadow-md"
                />
              </TabsList>
            </Tabs>

            <ThemeToggle />
            <Button variant="ghost" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>
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
            {/* Profile selector */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setProfileOpen((o) => !o)}
                className="px-3 py-2"
              >
                Profile: {profiles.find((p) => p.id === activeProfileId)?.name ?? 'Select profile'}
              </Button>
              {profileOpen && (
                <div className="absolute right-0 z-20 mt-1 w-44 max-h-60 overflow-y-auto rounded-md border bg-card shadow">
                  {profiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProfile(p.id)}
                      className={`block w-full text-left px-3 py-1.5 text-sm ${
                        p.id === activeProfileId ? 'bg-muted font-medium' : 'hover:bg-muted'
                      }`}
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
            {/* Sync button */}
            <Button onClick={handleSync} disabled={syncing} className="flex items-center gap-2">
              <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync Now'}
            </Button>
          </div>
        </header>

        {/* Category list */}
        <Card>
          <CardHeader className="px-4 py-2">
            <CardTitle>Problem Categories</CardTitle>
            <CardDescription>Categories sorted by completion (lowest first)</CardDescription>
          </CardHeader>

          <CardContent className="divide-y px-4">
            {criticalError && (
              <div className="p-6 text-sm text-destructive">
                Progress data could not be loaded. Try syncing again using the&nbsp;
                <strong>&quot;Sync&nbsp;Now&quot;</strong> button above.
              </div>
            )}
            {!criticalError && (
              <>
                {/* Random category */}
                <div key="random" className="py-4 space-y-3">
                  <button
                    className="w-full text-left space-y-2"
                    onClick={() => handleToggle('Random')}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2">
                      <div className="min-w-[180px]">
                        <span>Random</span>
                      </div>
                    </div>
                  </button>

                  <div
                    className={clsx(
                      'overflow-hidden transition-all duration-300 origin-top',
                      open === 'Random' ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
                    )}
                  >
                    {suggestions['Random'] && (
                      <Tabs defaultValue="fundamentals" className="mt-4 w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="fundamentals">Fundamentals</TabsTrigger>
                          <TabsTrigger value="refresh">Refresh</TabsTrigger>
                          <TabsTrigger value="new">New</TabsTrigger>
                        </TabsList>

                        {(['fundamentals', 'refresh', 'new'] as const).map((bucket) => (
                          <TabsContent key={bucket} value={bucket} className="mt-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {(suggestions['Random'] as CategoryRecommendation)[bucket].map(
                                (p: any) => (
                                  <Card key={p.slug} className="flex flex-col">
                                    <CardHeader className="p-4 pb-2">
                                      <div className="flex justify-between items-start">
                                        <CardTitle className="text-base">{p.title}</CardTitle>
                                        <DifficultyBadge level={p.difficulty} />
                                      </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 pb-2">
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {p.isFundamental && (
                                          <Badge
                                            variant="secondary"
                                            className="text-[11px] px-1.5 py-0.5"
                                          >
                                            Fundamental
                                          </Badge>
                                        )}
                                      </div>
                                      {bucket === 'refresh' && p.lastSolved && (
                                        <LastSolvedLabel ts={p.lastSolved} />
                                      )}
                                    </CardContent>
                                    <CardFooter className="p-4 pt-2 mt-auto flex justify-end">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() =>
                                          window.open(
                                            `https://leetcode.com/problems/${p.slug}`,
                                            '_blank',
                                          )
                                        }
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        Solve on LeetCode
                                      </Button>
                                    </CardFooter>
                                  </Card>
                                ),
                              )}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    )}
                  </div>
                </div>

                {sorted.map((cat) => {
                  const percent = Math.round(cat.adjustedScore * 100);
                  const goalPercent = Math.round(cat.goal * 100);
                  const isOpen = open === cat.tag;

                  return (
                    <div key={cat.tag} className="py-4 space-y-3">
                      {/* Summary row */}
                      <button
                        className="w-full text-left space-y-2"
                        onClick={() => handleToggle(cat.tag)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2">
                          {/* Category name – fixed width so bars align */}
                          <div className="min-w-[180px]">
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
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  {(suggestions[cat.tag] as CategoryRecommendation)[bucket].map(
                                    (p: any) => (
                                      <Card key={p.slug} className="flex flex-col">
                                        <CardHeader className="p-4 pb-2">
                                          <div className="flex justify-between items-start">
                                            <CardTitle className="text-base">{p.title}</CardTitle>
                                            <DifficultyBadge level={p.difficulty} />
                                          </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 pb-2">
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {p.tags?.map((tag: any) => (
                                              <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="text-[11px] px-1.5 py-0.5"
                                              >
                                                {tag}
                                              </Badge>
                                            ))}
                                            {p.isFundamental && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[11px] px-1.5 py-0.5"
                                              >
                                                Fundamental
                                              </Badge>
                                            )}
                                          </div>
                                          {bucket === 'refresh' && p.lastSolved && (
                                            <LastSolvedLabel ts={p.lastSolved} />
                                          )}
                                        </CardContent>
                                        <CardFooter className="p-4 pt-2 mt-auto flex justify-end">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="gap-1"
                                            onClick={() =>
                                              window.open(
                                                `https://leetcode.com/problems/${p.slug}`,
                                                '_blank',
                                              )
                                            }
                                          >
                                            <ExternalLink className="h-4 w-4" />
                                            Solve on LeetCode
                                          </Button>
                                        </CardFooter>
                                      </Card>
                                    ),
                                  )}
                                </div>
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
