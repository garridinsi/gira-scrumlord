// SPDX-License-Identifier: GPL-3.0-or-later
import { useState, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projects as projectsApi, sprints as sprintsApi, issues as issuesApi } from '../api/client';
import type { SprintRecord } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
import { ErrorMessage, EmptyState } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea } from '../components/ui/Input';
import { IssueTypeBadge, PriorityBadge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';

function SprintStateChip({ state }: { state: SprintRecord['state'] }) {
  const styles = {
    future: 'bg-surface-700 text-gray-400 border-surface-600',
    active: 'bg-accent-900/50 text-accent-400 border-accent-700',
    closed: 'bg-green-950/50 text-green-500 border-green-800',
  };
  return (
    <span className={`text-xs rounded-full px-2 py-0.5 border font-medium ${styles[state]}`}>
      {state}
    </span>
  );
}

function CreateSprintModal({
  open,
  onClose,
  projectKey,
}: {
  open: boolean;
  onClose: () => void;
  projectKey: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  const create = useMutation({
    mutationFn: () => projectsApi.sprints.create(projectKey, { name: name.trim(), goal: goal || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sprints', projectKey] });
      setName('');
      setGoal('');
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Sprint">
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
        className="space-y-4"
      >
        <Input
          label="Sprint name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sprint 42: Into the Abyss"
          required
          autoFocus
          maxLength={120}
        />
        <Textarea
          label="Goal (optional)"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What does victory look like? (The velociraptor demands clarity.)"
          rows={3}
        />
        {create.error && <ErrorMessage error={create.error} />}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={create.isPending}>
            Create Sprint
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SprintCard({
  sprint,
  projectKey,
}: {
  sprint: SprintRecord;
  projectKey: string;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(sprint.state === 'active');

  const { data: sprintIssues } = useQuery({
    queryKey: ['sprint-issues', sprint.id],
    queryFn: () => issuesApi.list({ sprintId: sprint.id }),
    enabled: expanded,
  });

  const startSprint = useMutation({
    mutationFn: () => sprintsApi.start(sprint.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sprints', projectKey] }),
  });

  const closeSprint = useMutation({
    mutationFn: () => sprintsApi.close(sprint.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sprints', projectKey] }),
  });

  const deleteSprint = useMutation({
    mutationFn: () => sprintsApi.delete(sprint.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sprints', projectKey] }),
  });

  const totalPoints =
    sprintIssues?.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0) ?? 0;
  const donePoints =
    sprintIssues?.reduce((sum, i) => {
      // We can't easily know the done category without statuses, so use closedAt as proxy
      return i.closedAt ? sum + (i.storyPoints ?? 0) : sum;
    }, 0) ?? 0;

  return (
    <div className="rounded-lg border border-surface-700 bg-surface-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-500 hover:text-gray-300 transition-colors text-xs"
          aria-label={expanded ? 'Collapse sprint' : 'Expand sprint'}
        >
          {expanded ? '▼' : '▶'}
        </button>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-200">{sprint.name}</h3>
            <SprintStateChip state={sprint.state} />
          </div>
          {sprint.goal && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{sprint.goal}</p>
          )}
        </div>

        {sprint.state === 'active' || sprint.state === 'future' ? (
          <span className="text-xs text-gray-500 font-mono">
            {totalPoints}pt total
          </span>
        ) : null}

        <div className="flex items-center gap-2">
          {sprint.state === 'future' && (
            <Button
              variant="primary"
              size="sm"
              isLoading={startSprint.isPending}
              onClick={() => startSprint.mutate()}
            >
              Start
            </Button>
          )}
          {sprint.state === 'active' && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={closeSprint.isPending}
              onClick={() => closeSprint.mutate()}
            >
              Close sprint
            </Button>
          )}
          {sprint.state === 'future' && (
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteSprint.isPending}
              onClick={() => {
                if (confirm('Delete this sprint? Issues will return to backlog.'))
                  deleteSprint.mutate();
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Velocity summary for closed sprints */}
      {sprint.state === 'closed' && sprint.committedPoints !== undefined && (
        <div className="px-4 py-2 bg-surface-850 border-b border-surface-800 flex items-center gap-4 text-xs">
          <span className="text-gray-500">Committed: <strong className="text-gray-300">{sprint.committedPoints}pt</strong></span>
          <span className="text-accent-400">🌀 completed</span>
        </div>
      )}

      {/* Issue list */}
      {expanded && (
        <div className="p-3">
          {!sprintIssues && <Spinner size="sm" />}
          {sprintIssues && sprintIssues.length === 0 && (
            <EmptyState message="No issues in this sprint yet." />
          )}
          {sprintIssues && sprintIssues.length > 0 && (
            <div className="space-y-1">
              {sprintIssues.map((issue) => (
                <div
                  key={issue.key}
                  className="flex items-center gap-2 rounded px-2 py-1.5 bg-surface-800 hover:bg-surface-750 transition-colors text-xs"
                >
                  <IssueTypeBadge type={issue.type} />
                  <span className="font-mono text-gray-500 shrink-0">{issue.key}</span>
                  <span className="flex-1 text-gray-300 truncate">{issue.title}</span>
                  <PriorityBadge priority={issue.priority} />
                  {issue.storyPoints !== null && (
                    <span className="font-mono rounded bg-surface-700 px-1.5 py-0.5 text-gray-400">
                      {issue.storyPoints}pt
                    </span>
                  )}
                  <Avatar user={issue.assignee} size="xs" />
                </div>
              ))}
            </div>
          )}
          {sprintIssues && sprintIssues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-surface-800 flex items-center gap-4 text-xs text-gray-500">
              <span>{sprintIssues.length} issues</span>
              <span>{totalPoints}pt total</span>
              {sprint.state === 'closed' && <span className="text-green-500">{donePoints}pt done</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SprintsPage() {
  const { key } = useParams<{ key: string }>();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: sprintList, isLoading, error } = useQuery({
    queryKey: ['sprints', key],
    queryFn: () => projectsApi.sprints.list(key!),
    enabled: !!key,
  });

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

  const active = (sprintList ?? []).filter((s) => s.state === 'active');
  const future = (sprintList ?? []).filter((s) => s.state === 'future');
  const closed = (sprintList ?? []).filter((s) => s.state === 'closed');

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-surface-800 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-100">
          <span className="text-accent-400">{key}</span> — Sprints
        </h1>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          + New Sprint
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
        {(sprintList ?? []).length === 0 && (
          <EmptyState
            message="No sprints yet. Create one and start the cycle of suffering."
            icon="🌀"
          />
        )}

        {active.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Active Sprint
            </h2>
            <div className="space-y-3">
              {active.map((s) => <SprintCard key={s.id} sprint={s} projectKey={key!} />)}
            </div>
          </section>
        )}

        {future.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Upcoming
            </h2>
            <div className="space-y-3">
              {future.map((s) => <SprintCard key={s.id} sprint={s} projectKey={key!} />)}
            </div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Closed
            </h2>
            <div className="space-y-3">
              {closed.map((s) => <SprintCard key={s.id} sprint={s} projectKey={key!} />)}
            </div>
          </section>
        )}
      </div>

      <CreateSprintModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectKey={key!}
      />
    </div>
  );
}
