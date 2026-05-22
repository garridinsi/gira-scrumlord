// SPDX-License-Identifier: GPL-3.0-or-later
import { cn } from '../../lib/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
  };
  return (
    <span
      className={cn(
        'inline-block border-2 border-surface-600 border-t-accent-500 rounded-full animate-spin',
        sizes[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-surface-950">
      <div className="flex flex-col items-center gap-4">
        <span className="text-4xl animate-spin-slow select-none">🌀</span>
        <p className="text-muted text-sm">the sprints are spinning…</p>
      </div>
    </div>
  );
}
