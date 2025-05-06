import { createContext, useContext, useState, type PropsWithChildren } from 'react';
import clsx from 'clsx';

interface TabsCtx {
  value: string;
  setValue: (_v: string) => void;
}

const TabsContext = createContext<TabsCtx | null>(null);

/* ---------- Root ---------- */

export function Tabs({
  defaultValue,
  children,
  className,
}: PropsWithChildren<{ defaultValue: string; className?: string }>) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className={className}>
      <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>
    </div>
  );
}

/* ---------- List ---------- */

export function TabsList({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={clsx(
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------- Trigger ---------- */

export function TabsTrigger({
  value,
  children,
  className,
  disabled,
}: PropsWithChildren<{
  value: string;
  className?: string;
  disabled?: boolean;
}>) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be rendered within a <Tabs> root');

  const active = ctx.value === value;
  return (
    <button
      type="button"
      disabled={disabled}
      data-state={active ? 'active' : 'inactive'}
      onClick={() => ctx.setValue(value)}
      className={clsx(
        'inline-flex w-full items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        active && 'bg-background text-foreground shadow',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ---------- Content ---------- */

export function TabsContent({
  value,
  children,
  className,
}: PropsWithChildren<{ value: string; className?: string }>) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be rendered within a <Tabs> root');

  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
