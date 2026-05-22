// SPDX-License-Identifier: GPL-3.0-or-later
import type { UserView } from '@gira/shared';
import { cn } from '../../lib/cn';

interface AvatarProps {
  user: UserView | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-5 h-5 text-xs',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
};

/** Deterministic background from name string */
function colorFromName(name: string): string {
  const colors = [
    'bg-purple-800',
    'bg-blue-800',
    'bg-green-800',
    'bg-amber-800',
    'bg-red-800',
    'bg-pink-800',
    'bg-teal-800',
    'bg-indigo-800',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length] ?? 'bg-surface-700';
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function Avatar({ user, size = 'sm', className }: AvatarProps) {
  if (!user) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-surface-700 text-gray-500',
          SIZE_CLASSES[size],
          className,
        )}
        title="Unassigned"
      >
        ?
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium text-white select-none',
        colorFromName(user.name),
        SIZE_CLASSES[size],
        className,
      )}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}
