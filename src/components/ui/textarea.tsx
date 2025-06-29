import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'border border-input bg-background rounded-md px-2 py-1 text-sm w-full',
        className,
      )}
      {...props}
    />
  );
}
