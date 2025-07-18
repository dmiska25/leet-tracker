import { PropsWithChildren } from 'react';
import clsx from 'clsx';

/**
 * Lightweight ScrollArea wrapper (overflow auto + customisable height).
 * Tailwind handles scrollbars via the browser default theme.
 */
export function ScrollArea({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <div className={clsx('overflow-auto', className)}>{children}</div>;
}
