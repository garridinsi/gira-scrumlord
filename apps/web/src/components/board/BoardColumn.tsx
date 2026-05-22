// SPDX-License-Identifier: GPL-3.0-or-later
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { BoardColumn as BoardColumnType } from '@gira/shared';
import { cn } from '../../lib/cn';
import { StatusDot } from '../ui/Badge';
import { IssueCard } from './IssueCard';

const WIP_LIMIT = 5;

interface BoardColumnProps {
  column: BoardColumnType;
  activeIssueKey?: string | null;
}

export function BoardColumn({ column, activeIssueKey }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status.id });

  const isInProgress = column.status.category === 'in_progress';
  const wipExceeded = isInProgress && column.issues.length > WIP_LIMIT;
  const issueIds = column.issues.map((i) => i.key);

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 rounded-t-lg border-b mb-2',
          wipExceeded
            ? 'bg-orange-950/30 border-orange-800/50'
            : 'bg-surface-850 border-surface-700',
        )}
      >
        <div className="flex items-center gap-2">
          <StatusDot category={column.status.category} />
          <span className="text-sm font-medium text-gray-200">{column.status.name}</span>
          <span
            className={cn(
              'text-xs rounded-full px-1.5 py-0.5 font-mono',
              wipExceeded
                ? 'bg-orange-900/60 text-orange-400'
                : 'bg-surface-700 text-gray-500',
            )}
          >
            {column.issues.length}
          </span>
        </div>
      </div>

      {/* WIP warning — dismissible */}
      {wipExceeded && <WipWarning count={column.issues.length} />}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-16 rounded-lg transition-colors space-y-2 p-1',
          isOver ? 'bg-accent-900/20 ring-1 ring-accent-600/40' : 'bg-transparent',
        )}
      >
        <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
          {column.issues.map((issue) => (
            <IssueCard
              key={issue.key}
              issue={issue}
              isDragging={issue.key === activeIssueKey}
            />
          ))}
        </SortableContext>

        {column.issues.length === 0 && (
          <div
            className={cn(
              'h-16 rounded border-2 border-dashed flex items-center justify-center',
              isOver ? 'border-accent-500/50 bg-accent-900/10' : 'border-surface-700',
            )}
          >
            <span className="text-xs text-gray-600">drop here</span>
          </div>
        )}
      </div>
    </div>
  );
}

function WipWarning({ count }: { count: number }) {
  // Lore says "columns explode if you put >5 cards in In Progress. Game mechanic."
  // We show a real, dismissible warning.
  return (
    <div
      className="mb-2 mx-1 px-3 py-2 rounded-md bg-orange-950/40 border border-orange-800/60 text-xs text-orange-400"
      role="alert"
    >
      <strong>WIP limit exceeded</strong> — {count} tickets "in progress." The velociraptor
      Product Owner is watching from the doorway. {count > 8 ? '🦖💥' : '🦖'}
    </div>
  );
}
