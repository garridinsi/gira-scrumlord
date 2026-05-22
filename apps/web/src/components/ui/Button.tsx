// SPDX-License-Identifier: GPL-3.0-or-later
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-accent-600 hover:bg-accent-500 text-white border border-accent-500/50 focus:ring-accent-500/50',
  secondary:
    'bg-surface-750 hover:bg-surface-700 text-gray-200 border border-surface-600 focus:ring-surface-500/50',
  ghost: 'bg-transparent hover:bg-surface-800 text-gray-300 border border-transparent focus:ring-surface-600/50',
  danger:
    'bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 focus:ring-red-500/50',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-surface-950',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...props}
      >
        {isLoading ? <Spinner size="sm" /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
