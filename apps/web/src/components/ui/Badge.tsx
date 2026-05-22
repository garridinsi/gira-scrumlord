// SPDX-License-Identifier: GPL-3.0-or-later
import type { Priority, IssueType, StatusCategory } from '@gira/shared';
import { cn } from '../../lib/cn';

// Priority badges
const PRIORITY_STYLES: Record<Priority, string> = {
  emergency:
    'bg-red-950 border border-red-600 text-red-400 animate-pulse-emergency font-bold tracking-wide',
  urgent: 'bg-orange-950/50 border border-orange-700 text-orange-400',
  high: 'bg-amber-950/50 border border-amber-700 text-amber-400',
  medium: 'bg-blue-950/50 border border-blue-800 text-blue-400',
  low: 'bg-surface-700 border border-surface-600 text-gray-400',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  emergency: '!! EMERGENCY',
  urgent: '! urgent',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium uppercase',
        PRIORITY_STYLES[priority],
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// Issue type icons / badges
const TYPE_STYLES: Record<IssueType, { bg: string; text: string; icon: string }> = {
  task: { bg: 'bg-blue-900/40', text: 'text-blue-400', icon: '◻' },
  bug: { bg: 'bg-red-900/40', text: 'text-red-400', icon: '✕' },
  story: { bg: 'bg-green-900/40', text: 'text-green-400', icon: '▷' },
  epic: { bg: 'bg-purple-900/40', text: 'text-purple-400', icon: '⚡' },
};

export function IssueTypeBadge({
  type,
  showLabel = false,
}: {
  type: IssueType;
  showLabel?: boolean;
}) {
  const style = TYPE_STYLES[type];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
      )}
      title={type}
    >
      <span>{style.icon}</span>
      {showLabel && <span>{type}</span>}
    </span>
  );
}

// Status category dot
const STATUS_CATEGORY_COLORS: Record<StatusCategory, string> = {
  todo: 'bg-gray-500',
  in_progress: 'bg-accent-500',
  done: 'bg-green-500',
};

export function StatusDot({ category }: { category: StatusCategory }) {
  return (
    <span
      className={cn('inline-block w-2 h-2 rounded-full', STATUS_CATEGORY_COLORS[category])}
      aria-label={category}
    />
  );
}

// Label chip
export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color, borderColor: `${color}44`, borderWidth: 1 }}
    >
      {name}
    </span>
  );
}
