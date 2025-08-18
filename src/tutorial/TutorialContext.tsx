import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getPrevUser,
  clearPrevUser,
  getTutorialActive,
  setTutorialActive,
  getTutorialStep,
  setTutorialStep,
  getTutorialStartedWithUser,
  setTutorialStartedWithUser,
  markTutorialSeen,
  clearTutorialSeen,
} from '@/storage/db';
import { db } from '@/storage/db';
import { trackTourStarted, trackTourFinished, trackTourStep } from '@/utils/analytics';

export type Step = {
  id: string;
  title: string;
  body: string;
  /** CSS selector of the anchor element for highlight/position */
  anchor?: string;
  /** 'top' | 'bottom' | 'left' | 'right' | 'center' | 'dynamic' */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'dynamic';
  /** If provided, wait until this selector appears before showing */
  waitFor?: string;
  /** Run before advancing to the next step (e.g., open a section or navigate) */
  onNext?: () => Promise<void> | void;
};

type TutorialCtx = {
  active: boolean;
  stepIndex: number;
  steps: Step[];
  start: (_steps: Step[], _opts: { startedWith: 'demo' | 'normal' }) => Promise<void>;
  stop: (_opts?: { restoreUser?: boolean }) => Promise<void>;
  next: () => Promise<void>;
  setSteps: (_s: Step[]) => void;
};

const Ctx = createContext<TutorialCtx | null>(null);

export function useTutorial() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTutorial must be used within <TutorialProvider>');
  return ctx;
}

function useAnchorRect(selector?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let raf = 0;
    const update = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      setRect(el ? el.getBoundingClientRect() : null);
      raf = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(raf);
  }, [selector]);
  return rect;
}

function useCardDimensions() {
  const [dimensions, setDimensions] = useState({ width: 384, height: 200 }); // reasonable defaults
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    // Initial measurement
    updateDimensions();

    // Update on window resize
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return { dimensions, ref };
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [startedWith, setStartedWith] = useState<'demo' | 'normal' | undefined>(undefined);

  // Resume if a tutorial was active on last load
  useEffect(() => {
    (async () => {
      if (await getTutorialActive()) {
        const idx = await getTutorialStep();
        const sw = await getTutorialStartedWithUser();
        setStartedWith(sw);
        setStepIndex(idx);
        setActive(true);

        // Track resuming tutorial (don't track as started since it was already started)
        if (steps.length > idx && steps[idx]) {
          const currentView =
            window.location.hash.includes('history') ||
            steps[idx].id.includes('history') ||
            steps[idx].id.includes('solve')
              ? 'history'
              : 'dashboard';
          trackTourStep(steps[idx].id, currentView);
        }
      }
    })();
  }, []);

  // Handle replay tour event
  useEffect(() => {
    const handleReplayTour = async () => {
      // Reset tutorial state and clear seen status so the prompt shows
      await setTutorialActive(false);
      await clearTutorialSeen();

      // Always just show the prompt, don't switch users automatically
      window.dispatchEvent(new CustomEvent('leet:show-tutorial-prompt'));
    };

    window.addEventListener('leet:replay-tour', handleReplayTour);
    return () => window.removeEventListener('leet:replay-tour', handleReplayTour);
  }, []);

  const go = async (to: number) => {
    setStepIndex(to);
    await setTutorialStep(to);
  };

  const next = async () => {
    const step = steps[stepIndex];
    if (step?.onNext) await step.onNext();
    const to = Math.min(steps.length, stepIndex + 1);
    if (to === steps.length) {
      await stop({ restoreUser: true });
    } else {
      await go(to);

      // Track the step we're moving to (if it exists)
      const nextStep = steps[to];
      if (nextStep) {
        // Determine current view based on step context or URL
        const currentView =
          window.location.hash.includes('history') ||
          nextStep.id.includes('history') ||
          nextStep.id.includes('solve')
            ? 'history'
            : 'dashboard';
        trackTourStep(nextStep.id, currentView);
      }
    }
  };

  const start = async (_steps: Step[], opts: { startedWith: 'demo' | 'normal' }) => {
    setSteps(_steps);
    setStartedWith(opts.startedWith);
    setActive(true);
    await setTutorialStartedWithUser(opts.startedWith);
    await setTutorialStep(0);
    await setTutorialActive(true);

    // Track tutorial started
    trackTourStarted();

    // Track first step
    if (_steps.length > 0) {
      trackTourStep(_steps[0].id, 'dashboard');
    }
  };

  const stop = async (opts?: { restoreUser?: boolean }) => {
    const isCompleted = stepIndex >= steps.length - 1;

    setActive(false);
    await setTutorialActive(false);
    await setTutorialStep(0);

    // Mark tutorial as seen when completed
    await markTutorialSeen();

    // Track tutorial completion
    trackTourFinished(isCompleted ? 'finished' : 'skipped');

    // If we started with normal user, restore them
    if (opts?.restoreUser && startedWith === 'normal') {
      const prev = await getPrevUser();
      if (prev) {
        await db.setUsername(prev);
        await clearPrevUser();
        window.location.reload();
      }
    }
  };

  const value = useMemo(
    () => ({
      active,
      stepIndex,
      steps,
      start,
      stop,
      next,
      setSteps,
    }),
    [active, stepIndex, steps],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <TutorialOverlay />
    </Ctx.Provider>
  );
}

function calculateBestPlacement(
  rect: DOMRect,
  cardSize: { width: number; height: number },
): 'top' | 'bottom' | 'left' | 'right' | 'center' {
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const padding = 16; // minimum distance from viewport edges

  // Calculate available space in each direction
  const spaces = {
    top: rect.top - padding,
    bottom: viewport.height - rect.bottom - padding,
    left: rect.left - padding,
    right: viewport.width - rect.right - padding,
  };

  // Check if card fits in each direction
  const fits = {
    top: spaces.top >= cardSize.height,
    bottom: spaces.bottom >= cardSize.height,
    left: spaces.left >= cardSize.width,
    right: spaces.right >= cardSize.width,
  };

  // Priority order: prefer bottom, then top, then right, then left
  if (fits.bottom) return 'bottom';
  if (fits.top) return 'top';
  if (fits.right) return 'right';
  if (fits.left) return 'left';

  // On mobile screens (width < 768px), prefer center over sides that would go off-screen
  if (viewport.width < 768) {
    // If we're here, nothing fits perfectly, so pick the safest option
    // Center is always guaranteed to be on screen
    return 'center';
  }

  // Fallback: pick direction with most space
  const maxSpace = Math.max(spaces.top, spaces.bottom, spaces.left, spaces.right);
  if (maxSpace === spaces.bottom) return 'bottom';
  if (maxSpace === spaces.top) return 'top';
  if (maxSpace === spaces.right) return 'right';
  if (maxSpace === spaces.left) return 'left';

  // Ultimate fallback
  return 'center';
}

/** Overlay UI */
function TutorialOverlay() {
  const { active, steps, stepIndex, next, stop } = useTutorial();
  const [username, setUsername] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const { dimensions: cardDimensions, ref: cardRef } = useCardDimensions();

  // Get current username
  useEffect(() => {
    (async () => {
      const user = await db.getUsername();
      setUsername(user);
      setIsLoading(false);
    })();
  }, []);

  const step = steps[stepIndex];
  const anchor = step?.anchor ?? undefined;

  // Only show overlay if we're on the demo account
  const demoUsername = import.meta.env.VITE_DEMO_USERNAME || 'leet-tracker-demo-user';
  const shouldShowOverlay = active && username === demoUsername && !isLoading;

  // Wait for required selector (if any)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!shouldShowOverlay || !step) return;
    if (!step.waitFor) {
      setReady(true);
      return;
    }
    let id = 0;
    const tick = () => {
      const ok = !!document.querySelector(step.waitFor!);
      setReady(ok);
      if (!ok) id = window.setTimeout(tick, 150);
    };
    tick();
    return () => clearTimeout(id);
  }, [shouldShowOverlay, step]);

  const rect = useAnchorRect(ready ? anchor : undefined);

  // Calculate dynamic placement if needed
  const actualPlacement = useMemo(() => {
    if (!step?.placement || step.placement !== 'dynamic' || !rect) {
      return step?.placement;
    }
    return calculateBestPlacement(rect, cardDimensions);
  }, [step?.placement, rect, cardDimensions]);

  if (!shouldShowOverlay || !step) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-none"
      aria-label="tutorial-overlay"
      role="dialog"
    >
      {/* Spotlight overlay: dim everything except highlighted area */}
      {rect ? (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top section */}
          <div
            className="absolute bg-black/50"
            style={{
              left: 0,
              top: 0,
              width: '100%',
              height: rect.top - 6,
            }}
          />
          {/* Left section */}
          <div
            className="absolute bg-black/50"
            style={{
              left: 0,
              top: rect.top - 6,
              width: rect.left - 6,
              height: rect.height + 12,
            }}
          />
          {/* Right section */}
          <div
            className="absolute bg-black/50"
            style={{
              left: rect.right + 6,
              top: rect.top - 6,
              width: `calc(100% - ${rect.right + 6}px)`,
              height: rect.height + 12,
            }}
          />
          {/* Bottom section */}
          <div
            className="absolute bg-black/50"
            style={{
              left: 0,
              top: rect.bottom + 6,
              width: '100%',
              height: `calc(100% - ${rect.bottom + 6}px)`,
            }}
          />
        </div>
      ) : (
        /* Fallback: dim entire background when no anchor */
        <div className="absolute inset-0 bg-black/50" />
      )}

      {/* highlight box */}
      {rect && (
        <div
          className="absolute border-2 border-orange-400 rounded-lg pointer-events-none transition-all shadow-lg"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* card */}
      <div
        ref={cardRef}
        className="absolute max-w-[calc(100vw-2rem)] sm:max-w-sm rounded-lg bg-card border p-4 shadow pointer-events-auto"
        style={tooltipPos(rect, actualPlacement)}
      >
        <h4 className="font-semibold mb-1">{step.title}</h4>
        <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{step.body}</p>
        <div className="flex justify-between items-center">
          <button
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => stop({ restoreUser: true })}
          >
            Skip tutorial
          </button>
          <button
            className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground"
            onClick={next}
          >
            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function tooltipPos(rect: DOMRect | null, placement: Step['placement']) {
  // Fallback center if no rect
  if (!rect) return { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' } as const;

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const padding = 10;
  const isMobile = viewport.width < 640; // sm breakpoint

  // Calculate initial positions
  const dynamicCardWidth = isMobile
    ? Math.min(viewport.width - 32, 384) // Mobile: full width minus padding, capped at 384px
    : 384; // Desktop: normal sizing

  const pos = {
    top: { left: rect.left, top: rect.top - 12 - 140 }, // approx card height
    bottom: { left: rect.left, top: rect.bottom + padding },
    left: { left: rect.left - dynamicCardWidth, top: rect.top },
    right: { left: rect.right + padding, top: rect.top },
    center: {
      left: rect.left + rect.width / 2,
      top: rect.top + rect.height + 10,
      transform: 'translateX(-50%)' as const,
    },
  };

  // Handle dynamic case - this should never happen since we resolve it before calling this function
  const actualPlacement = placement === 'dynamic' ? 'bottom' : (placement ?? 'bottom');

  let position = pos[actualPlacement as keyof typeof pos];

  // Ensure the tooltip stays on screen - clamp to viewport bounds
  // This is critical for mobile where we must keep tooltips visible
  const cardWidth = isMobile ? dynamicCardWidth : actualPlacement === 'center' ? 192 : 384; // Desktop: normal sizing
  const cardHeight = 140; // approximate height

  if (typeof position.left === 'number') {
    // Special handling for center placement with transform
    if (actualPlacement === 'center') {
      // For center placement, we need to ensure the element (after transform) stays on screen
      const halfCardWidth = cardWidth / 2;
      position.left = Math.max(
        halfCardWidth + padding,
        Math.min(viewport.width - halfCardWidth - padding, position.left),
      );
    } else {
      // Regular clamping for other placements
      position.left = Math.max(
        padding,
        Math.min(viewport.width - cardWidth - padding, position.left),
      );
    }
  }

  if (typeof position.top === 'number') {
    // Clamp vertical position
    position.top = Math.max(
      padding,
      Math.min(viewport.height - cardHeight - padding, position.top),
    );
  }

  return position;
}
