import type { HTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

export function Alert({ className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={clsx('flex items-start gap-2 rounded-lg border p-4', className)} {...props} />
  );
}

export function AlertDescription({
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return <div className={clsx('text-sm', className)} {...props} />;
}
