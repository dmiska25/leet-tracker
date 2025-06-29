import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx('border border-input rounded-md px-2 py-1 text-sm', className)}
      {...props}
    >
      {children}
    </select>
  );
}
