import type { HTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

export function Badge({
  className,
  variant = 'default',
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLSpanElement> & { variant?: 'default' | 'secondary' | 'outline' }
>) {
  const styles = {
    default: 'bg-secondary text-secondary-foreground',
    secondary: 'bg-muted text-foreground',
    outline: 'border border-border', // colour supplied by caller
  }[variant];

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs',
        styles,
        className,
      )}
      {...props}
    />
  );
}
