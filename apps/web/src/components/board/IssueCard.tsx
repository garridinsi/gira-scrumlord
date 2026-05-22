// SPDX-License-Identifier: GPL-3.0-or-later
import { useNavigate } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { IssueView } from '@gira/shared';
import { cn } from '../../lib/cn';
import { PriorityBadge, IssueTypeBadge, LabelChip } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

interface IssueCardProps {
  issue: IssueView;
  isDragging?: boolean;
}

export function IssueCard({ issue, isDragging = false }: IssueCardProps) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: issue.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEmergency = issue.priority === 'emergency';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group relative rounded-lg border bg-surface-800 p-3 cursor-grab active:cursor-grabbing',
        'transition-all duration-150',
        'hover:border-surface-500 hover:bg-surface-750',
        isSortableDragging || isDragging
          ? 'opacity-40 border-accent-600/50 shadow-none'
          : 'border-surface-700 shadow-sm shadow-black/40',
        isEmergency && !isSortableDragging
          ? 'border-red-700 ring-1 ring-red-700/50 animate-pulse-emergency'
          : '',
      )}
    >
      {/* Emergency indicator */}
      {isEmergency && (
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-red-500 rounded-t-lg" />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <IssueTypeBadge type={issue.type} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/issues/${issue.key}`);
            }}
            className="text-xs font-mono text-gray-500 hover:text-accent-400 transition-colors shrink-0"
          >
            {issue.key}
          </button>
        </div>
        <PriorityBadge priority={issue.priority} />
      </div>

      {/* Title */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/issues/${issue.key}`);
        }}
        className="text-sm text-gray-200 font-medium leading-snug text-left hover:text-white transition-colors line-clamp-2 w-full mb-2"
      >
        {issue.title}
      </button>

      {/* Labels */}
      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {issue.labels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} name={l.name} color={l.color} />
          ))}
          {issue.labels.length > 3 && (
            <span className="text-xs text-gray-600">+{issue.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-1">
        <Avatar user={issue.assignee} size="xs" />
        {issue.storyPoints !== null && (
          <span className="text-xs font-mono rounded bg-surface-700 px-1.5 py-0.5 text-gray-400">
            {issue.storyPoints}pt
          </span>
        )}
      </div>
    </div>
  );
}

/** Overlay clone shown while dragging */
export function IssueCardOverlay({ issue }: { issue: IssueView }) {
  const isEmergency = issue.priority === 'emergency';
  return (
    <div
      className={cn(
        'rounded-lg border p-3 bg-surface-750 shadow-2xl shadow-black/80 rotate-1 opacity-95',
        isEmergency ? 'border-red-600' : 'border-accent-600/60',
      )}
      style={{ width: 256 }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <IssueTypeBadge type={issue.type} />
        <span className="text-xs font-mono text-gray-500">{issue.key}</span>
      </div>
      <p className="text-sm text-gray-200 font-medium line-clamp-2">{issue.title}</p>
    </div>
  );
}
