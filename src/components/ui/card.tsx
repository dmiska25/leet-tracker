import type { HTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

/* ---------- Outer wrapper ---------- */
export function Card({ className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      className={clsx('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  );
}

/* ---------- Internal helpers ---------- */
function Section({ className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  /* only spacing/utility classes should be added by the caller */
  return <div className={clsx(className)} {...props} />;
}

export const CardHeader = Section;
export const CardContent = Section;
export const CardFooter = Section;

export function CardTitle({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <h3 className={clsx('text-sm font-medium', className)}>{children}</h3>;
}

export function CardDescription({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <p className={clsx('text-xs text-muted-foreground', className)}>{children}</p>;
}
