import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'border border-input bg-background rounded-md px-2 py-1 text-sm w-full',
        className,
      )}
      {...props}
    />
  );
}
