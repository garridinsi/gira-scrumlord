// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { BoardView, IssueView } from '@gira/shared';
import { projects, issues } from '../api/client';
import { BoardColumn } from '../components/board/BoardColumn';
import { IssueCardOverlay } from '../components/board/IssueCard';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { getDropNeighbors } from '../lib/board';
import { BoardFilters } from '../components/board/BoardFilters';
import type { BoardFilterState } from '../components/board/BoardFilters';

function applyFilters(board: BoardView, filters: BoardFilterState): BoardView {
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      issues: col.issues.filter((issue) => {
        if (filters.type && issue.type !== filters.type) return false;
        if (filters.priority && issue.priority !== filters.priority) return false;
        if (filters.assigneeId && issue.assignee?.id !== filters.assigneeId) return false;
        if (filters.labelId && !issue.labels.some((l) => l.id === filters.labelId)) return false;
        if (filters.q) {
          const q = filters.q.toLowerCase();
          if (!issue.title.toLowerCase().includes(q) && !issue.key.toLowerCase().includes(q))
            return false;
        }
        return true;
      }),
    })),
  };
}

export function BoardPage() {
  const { key } = useParams<{ key: string }>();
  const queryClient = useQueryClient();
  const [activeIssue, setActiveIssue] = useState<IssueView | null>(null);
  const [filters, setFilters] = useState<BoardFilterState>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const {
    data: board,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['board', key],
    queryFn: () => projects.board(key!),
    enabled: !!key,
  });

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      if (!board) return;
      const found = board.columns.flatMap((c) => c.issues).find((i) => i.key === active.id);
      if (found) setActiveIssue(found);
    },
    [board],
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveIssue(null);
      if (!over || !board || !key) return;

      const activeKey = String(active.id);
      const overId = String(over.id);

      // Find source column and issue
      const sourceCol = board.columns.find((c) => c.issues.some((i) => i.key === activeKey));
      if (!sourceCol) return;

      // over.id can be either a statusId (column) or an issue key
      // Determine target column
      const targetColByStatus = board.columns.find((c) => c.status.id === overId);
      const targetColByIssue = board.columns.find((c) => c.issues.some((i) => i.key === overId));
      const targetCol = targetColByStatus ?? targetColByIssue;
      if (!targetCol) return;

      const targetStatusId = targetCol.status.id;
      const isSameColumn = sourceCol.status.id === targetStatusId;

      // Build the new order for the target column
      let targetIssues = [...targetCol.issues];

      if (isSameColumn) {
        const oldIndex = targetIssues.findIndex((i) => i.key === activeKey);
        const newIndex = targetColByIssue
          ? targetIssues.findIndex((i) => i.key === overId)
          : targetIssues.length;
        if (oldIndex === newIndex) return;
        targetIssues = arrayMove(targetIssues, oldIndex, newIndex);
      } else {
        // Moving to different column: insert at drop point
        const movedIssue = sourceCol.issues.find((i) => i.key === activeKey);
        if (!movedIssue) return;
        const overIndex = targetColByIssue
          ? targetIssues.findIndex((i) => i.key === overId)
          : targetIssues.length;
        const insertIndex = overIndex >= 0 ? overIndex : targetIssues.length;
        targetIssues.splice(insertIndex, 0, movedIssue);
      }

      // Compute neighbors for the API
      const droppedIdx = targetIssues.findIndex((i) => i.key === activeKey);
      const { beforeId, afterId } = getDropNeighbors(targetIssues, droppedIdx, activeKey);

      // Optimistic update
      const optimisticBoard: BoardView = {
        ...board,
        columns: board.columns.map((col) => {
          if (col.status.id === sourceCol.status.id && col.status.id !== targetStatusId) {
            return { ...col, issues: col.issues.filter((i) => i.key !== activeKey) };
          }
          if (col.status.id === targetStatusId) {
            return { ...col, issues: targetIssues };
          }
          return col;
        }),
      };
      queryClient.setQueryData(['board', key], optimisticBoard);

      // API call
      issues
        .move(activeKey, {
          statusId: isSameColumn ? undefined : targetStatusId,
          beforeId,
          afterId,
        })
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ['board', key] });
        })
        .catch(() => {
          // Rollback on error
          void queryClient.invalidateQueries({ queryKey: ['board', key] });
        });
    },
    [board, key, queryClient],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage error={error} />
      </div>
    );
  }

  if (!board) return null;

  const filteredBoard = applyFilters(board, filters);

  // Collect all unique assignees and labels for filter dropdowns
  const allIssues = board.columns.flatMap((c) => c.issues);
  const allLabels = Array.from(
    new Map(allIssues.flatMap((i) => i.labels).map((l) => [l.id, l])).values(),
  );
  const allAssignees = Array.from(
    new Map(
      allIssues
        .filter((i) => i.assignee !== null)
        .map((i) => [i.assignee!.id, i.assignee!]),
    ).values(),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-100">
          <span className="text-accent-400">{key}</span> — Board
        </h1>
      </div>

      {/* Filters */}
      <BoardFilters
        filters={filters}
        onChange={setFilters}
        assignees={allAssignees}
        labels={allLabels}
      />

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-6 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full">
            {filteredBoard.columns.map((column) => (
              <BoardColumn
                key={column.status.id}
                column={column}
                activeIssueKey={activeIssue?.key ?? null}
              />
            ))}
          </div>

          <DragOverlay>
            {activeIssue ? <IssueCardOverlay issue={activeIssue} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
