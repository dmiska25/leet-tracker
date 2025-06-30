import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

/**
 * Thin horizontal line with theme-aware colour.
 */
export function Separator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" className={clsx('w-full h-px bg-border', className)} {...props} />;
}
