import { forwardRef, TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

/**
 * Shadcn-style textarea with sensible defaults.
 */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={clsx(
      'w-full rounded-md border px-3 py-2 text-sm bg-background',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
      'disabled:opacity-50 disabled:pointer-events-none',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
