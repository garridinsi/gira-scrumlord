// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { IssueType, Priority } from '@gira/shared';
import { projects, issues, sprints as sprintsApi } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage, EmptyState } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { PriorityBadge, IssueTypeBadge, LabelChip, StatusDot } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { CreateIssueModal } from '../components/issues/CreateIssueModal';
import { Input } from '../components/ui/Input';

interface FilterState {
  q?: string;
  type?: IssueType;
  priority?: Priority;
}

export function BacklogPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedIssueKeys, setSelectedIssueKeys] = useState<Set<string>>(new Set());
  const [assignToSprintId, setAssignToSprintId] = useState<string>('');

  const { data: backlog, isLoading, error } = useQuery({
    queryKey: ['backlog', key],
    queryFn: () => projects.backlog(key!),
    enabled: !!key,
  });

  const { data: sprintList } = useQuery({
    queryKey: ['sprints', key],
    queryFn: () => projects.sprints.list(key!),
    enabled: !!key,
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses', key],
    queryFn: () => projects.statuses.list(key!),
    enabled: !!key,
  });

  const assignToSprint = useMutation({
    mutationFn: async (sprintId: string) => {
      const ops = Array.from(selectedIssueKeys).map((issueKey) =>
        issues.update(issueKey, { sprintId }),
      );
      await Promise.all(ops);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['backlog', key] });
      setSelectedIssueKeys(new Set());
      setAssignToSprintId('');
    },
  });

  const filtered = (backlog ?? []).filter((issue) => {
    if (filters.type && issue.type !== filters.type) return false;
    if (filters.priority && issue.priority !== filters.priority) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!issue.title.toLowerCase().includes(q) && !issue.key.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  function toggleSelect(issueKey: string) {
    setSelectedIssueKeys((prev) => {
      const next = new Set(prev);
      if (next.has(issueKey)) next.delete(issueKey);
      else next.add(issueKey);
      return next;
    });
  }

  const futureAndActiveSprints = (sprintList ?? []).filter(
    (s) => s.state === 'future' || s.state === 'active',
  );

  const statusMap = new Map((statuses ?? []).map((s) => [s.id, s]));

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-100">
          <span className="text-accent-400">{key}</span> — Backlog
        </h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + New Issue
        </Button>
      </div>

      {/* Filters */}
      <div className="px-6 py-2 border-b border-surface-800 flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search…"
          value={filters.q ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
          className="h-7 text-xs w-44"
        />
        <select
          value={filters.type ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, type: (e.target.value as IssueType) || undefined }))}
          className="h-7 rounded-md bg-surface-800 border border-surface-600 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
        >
          <option value="">All types</option>
          <option value="task">Task</option>
          <option value="bug">Bug</option>
          <option value="story">Story</option>
          <option value="epic">Epic</option>
        </select>
        <select
          value={filters.priority ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, priority: (e.target.value as Priority) || undefined }))}
          className="h-7 rounded-md bg-surface-800 border border-surface-600 px-2 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent-500/50"
        >
          <option value="">All priorities</option>
          <option value="emergency">!! Emergency</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Bulk assign to sprint */}
      {selectedIssueKeys.size > 0 && (
        <div className="px-6 py-2 bg-accent-900/20 border-b border-accent-800/40 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-accent-300">{selectedIssueKeys.size} selected</span>
          {futureAndActiveSprints.length > 0 && (
            <>
              <select
                value={assignToSprintId}
                onChange={(e) => setAssignToSprintId(e.target.value)}
                className="h-7 rounded-md bg-surface-800 border border-surface-600 px-2 text-xs text-gray-300 focus:outline-none"
              >
                <option value="">Pick a sprint…</option>
                {futureAndActiveSprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.state})
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                isLoading={assignToSprint.isPending}
                disabled={!assignToSprintId}
                onClick={() => assignToSprint.mutate(assignToSprintId)}
              >
                Assign to sprint
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSelectedIssueKeys(new Set())}>
            Deselect
          </Button>
        </div>
      )}

      {/* Issue list */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 && (
          <EmptyState
            message={
              backlog?.length === 0
                ? 'The backlog is empty. Peaceful. The velociraptor approves.'
                : 'No issues match your filters.'
            }
          />
        )}

        <div className="space-y-1">
          {filtered.map((issue) => {
            const status = statusMap.get(issue.statusId);
            const isSelected = selectedIssueKeys.has(issue.key);
            return (
              <div
                key={issue.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors cursor-pointer group
                  ${isSelected
                    ? 'bg-accent-900/30 border-accent-700/50'
                    : 'bg-surface-850 border-surface-700 hover:bg-surface-800 hover:border-surface-600'
                  }`}
                onClick={() => toggleSelect(issue.key)}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(issue.key)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500/50"
                  aria-label={`Select ${issue.key}`}
                />

                <IssueTypeBadge type={issue.type} />

                <button
                  className="font-mono text-xs text-gray-500 hover:text-accent-400 shrink-0 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/issues/${issue.key}`);
                  }}
                >
                  {issue.key}
                </button>

                <button
                  className="flex-1 text-sm text-gray-200 text-left hover:text-white transition-colors truncate"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/issues/${issue.key}`);
                  }}
                >
                  {issue.title}
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {issue.labels.slice(0, 2).map((l) => (
                    <LabelChip key={l.id} name={l.name} color={l.color} />
                  ))}

                  {status && <StatusDot category={status.category} />}

                  <PriorityBadge priority={issue.priority} />

                  {issue.storyPoints !== null && (
                    <span className="text-xs font-mono rounded bg-surface-700 px-1.5 py-0.5 text-gray-400">
                      {issue.storyPoints}pt
                    </span>
                  )}

                  <Avatar user={issue.assignee} size="xs" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateIssueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectKey={key!}
      />
    </div>
  );
}
