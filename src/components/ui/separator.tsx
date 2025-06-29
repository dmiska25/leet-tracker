import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

export function Separator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('border-b border-border my-4', className)} {...props} />;
}
