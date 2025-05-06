import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...rest
}: PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'outline' | 'ghost';
    size?: 'sm' | 'md';
  }
>) {
  const style = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border border-border hover:bg-secondary',
    ghost: 'hover:bg-muted',
  }[variant];

  const sizeStyle = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-md',
        sizeStyle,
        style,
        className,
      )}
      {...rest}
    />
  );
}
